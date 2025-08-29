import express from 'express'
import cors from 'cors'
import pino from 'pino'
import pinoHttp from 'pino-http'
import { z } from 'zod'
import { config } from './config.js'
import { streamChat } from './llm/openaiClient.js'
import { AppError, ERROR_CODES, mapUpstreamError } from './utils/errors.js'
import { handleUpload } from '@vercel/blob/client'

const app = express()
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

app.use(cors({ origin: config.corsOrigin }))
// Responder automaticamente preflight (OPTIONS)
app.options('*', cors({ origin: config.corsOrigin }))
app.use(express.json({ limit: '10mb' }))
app.use(pinoHttp({ logger }))

// Rate limiting in-memory por IP (janela fixa)
const WINDOW_MS = 5 * 60 * 1000 // 5 minutos
const LIMITS = { general: 60, chat: 30 }
const buckets = new Map() // ip -> { start: number, countGeneral: number, countChat: number }
function rateLimit(kind = 'general') {
  return (req, res, next) => {
    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown'
    const now = Date.now()
    let b = buckets.get(ip)
    if (!b || now - b.start > WINDOW_MS) {
      b = { start: now, countGeneral: 0, countChat: 0 }
      buckets.set(ip, b)
    }
    if (kind === 'chat') b.countChat++
    else b.countGeneral++
    const limit = kind === 'chat' ? LIMITS.chat : LIMITS.general
    const used = kind === 'chat' ? b.countChat : b.countGeneral
    if (used > limit) {
      res.status(429).json({
        code: 'RATE_LIMITED',
        message: 'Muitas requisições. Tente novamente em alguns minutos.',
      })
      return
    }
    next()
  }
}

app.get('/health', rateLimit('general'), (req, res) => {
  res.json({ status: 'ok' })
})

const ChatSchema = z.object({
  message: z.string().min(1),
  mode: z.enum(['SDR', 'Closer']).default('SDR'),
  tone: z.enum(['breve', 'detalhado']).default('breve'),
  formality: z.enum(['informal', 'formal']).default('informal'),
  objective: z
    .enum(['qualificar', 'objeções', 'descoberta', 'fechamento', 'follow-up'])
    .default('qualificar'),
  attachments: z
    .array(
      z.object({
        kind: z.enum(['image', 'text']),
        content: z.string().min(1),
        mime: z.string().optional(),
        name: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
})

// Sugestões estáticas por objetivo/modo (v1 simples, sem chamada extra ao LLM)
function generateSuggestions(objective = 'qualificar', mode = 'SDR') {
  const base = {
    qualificar: [
      'Perguntar autoridade e papel na decisão',
      'Checar orçamento aproximado',
      'Sugerir call de 15 minutos esta semana',
    ],
    objeções: [
      'Explorar objeção de preço com foco em ROI',
      'Trazer um case curto de cliente similar',
      'Oferecer um piloto/POC enxuto',
    ],
    descoberta: [
      'Aprofundar nos critérios de sucesso',
      'Entender integração com sistemas atuais',
      'Validar prazos e partes envolvidas',
    ],
    fechamento: [
      'Alinhar próximos passos e responsáveis',
      'Solicitar aprovação para contrato',
      'Confirmar cronograma de onboarding',
    ],
    'follow-up': [
      'Enviar resumo com próximos passos',
      'Agendar retorno em data específica',
      'Perguntar bloqueios para avançar',
    ],
  }
  const list = base[objective] || base.qualificar
  // Variação leve por modo
  if (mode === 'Closer' && objective === 'qualificar') {
    return [
      'Validar decisores do comitê',
      'Confirmar critérios de compra',
      'Propor call com sponsor',
    ]
  }
  return list.slice(0, 3)
}

// SSE endpoint
app.post('/chat/stream', rateLimit('chat'), async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // Força envio imediato dos headers
  if (typeof res.flushHeaders === 'function') {
    try {
      res.flushHeaders()
    } catch (_) {}
  }

  // Envia um primeiro evento "open" com data para evitar fechamento por buffers de browser/proxies
  try {
    res.write('event: open\n')
    res.write('data: {}\n\n')
  } catch (_) {}

  // Heartbeat para manter conexão viva
  const heartbeat = setInterval(() => {
    try {
      res.write('event: ping\n')
      res.write('data: \n\n')
    } catch (_) {}
  }, 15000)

  // Cancelamento/cleanup quando a resposta é fechada (cliente desconectou ou servidor finalizou)
  const controller = new AbortController()
  const startAt = Date.now()
  const onResClose = () => {
    clearInterval(heartbeat)
    try {
      controller.abort(new Error('Client disconnected'))
    } catch (_) {}
    if ((process.env.LOG_LEVEL || 'info') === 'debug' && process.env.NODE_ENV !== 'production') {
      req.log?.info(
        { elapsedMs: Date.now() - startAt, headersSent: res.headersSent },
        'response close (cleanup)',
      )
    }
    // Não tente escrever no response aqui — ele já está fechado
  }
  res.on('close', onResClose)

  // Logs e tratamento para abort explícito do request (antes da resposta fechar)
  req.on?.('aborted', () => {
    clearInterval(heartbeat)
    try {
      controller.abort(new Error('Request aborted'))
    } catch (_) {}
    if ((process.env.LOG_LEVEL || 'info') === 'debug' && process.env.NODE_ENV !== 'production') {
      req.log?.warn({ elapsedMs: Date.now() - startAt }, 'request aborted event')
    }
  })
  res.on?.('close', () => {
    if ((process.env.LOG_LEVEL || 'info') === 'debug' && process.env.NODE_ENV !== 'production') {
      req.log?.warn(
        { elapsedMs: Date.now() - startAt, headersSent: res.headersSent },
        'response close event',
      )
    }
  })

  let parsed
  try {
    parsed = ChatSchema.parse(req.body)
  } catch (e) {
    clearInterval(heartbeat)
    res.write('event: error\n')
    res.write(`data: ${JSON.stringify({ code: 'BAD_REQUEST', message: 'Payload inválido' })}\n\n`)
    try {
      res.write('event: end\n')
    } catch (_) {}
    try {
      res.write('data: {}\n\n')
    } catch (_) {}
    res.end()
    return
  }

  if (!config.openai.apiKey) {
    clearInterval(heartbeat)
    res.write('event: error\n')
    res.write(
      `data: ${JSON.stringify({ code: 'MISSING_API_KEY', message: 'OPENAI_API_KEY não configurada' })}\n\n`,
    )
    res.end()
    return
  }

  let hadChunks = false
  try {
    if ((process.env.LOG_LEVEL || 'info') === 'debug' && process.env.NODE_ENV !== 'production') {
      req.log?.info(
        { model: config.openai.modelPreferred || config.openai.model },
        'streamChat start',
      )
    }

    await streamChat(
      parsed,
      (chunk) => {
        hadChunks = true
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
      },
      { signal: controller.signal, timeoutMs: 90000 },
    )

    if (hadChunks) {
      const suggestions = generateSuggestions(parsed.objective, parsed.mode)
      if (suggestions?.length) {
        res.write('event: suggestions\n')
        res.write(`data: ${JSON.stringify({ suggestions })}\n\n`)
      }
    }
  } catch (err) {
    const mapped = err instanceof AppError ? err : mapUpstreamError(err, 'OpenAI')
    req.log?.error({ err: mapped, elapsedMs: Date.now() - startAt }, 'streamChat error')
    res.write('event: error\n')
    res.write(`data: ${JSON.stringify(mapped.toJSON())}\n\n`)
  } finally {
    clearInterval(heartbeat)
    try {
      res.write('event: end\n')
    } catch (_) {}
    try {
      res.write('data: {}\n\n')
    } catch (_) {}
    try {
      res.end()
    } catch (_) {}
  }
})

// Templates estáticos por modo/objetivo
const TemplatesQuery = z.object({ mode: z.enum(['SDR', 'Closer']).default('SDR') })
app.get('/templates', rateLimit('general'), (req, res) => {
  const mode = (req.query?.mode || 'SDR') === 'Closer' ? 'Closer' : 'SDR'
  const data = {
    SDR: {
      qualificar: [
        'Pergunte sobre orçamento, autoridade e necessidade do lead.',
        'Solicite disponibilidade para uma call de 15 minutos nesta semana.',
      ],
      objeções: ['Responda a objeções comuns sobre preço com foco em ROI e caso de uso.'],
    },
    Closer: {
      descoberta: ['Aprofunde nos requisitos técnicos e restrições de prazo.'],
      fechamento: ['Reforce valor e próximos passos: contrato e cronograma de implementação.'],
    },
  }
  res.json({ mode, templates: data[mode] })
})

// Feedback 👍👎
const FeedbackSchema = z.object({
  rating: z.enum(['up', 'down']),
  reason: z.string().max(500).optional(),
})
app.post('/feedback', rateLimit('general'), (req, res) => {
  const parsed = FeedbackSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ code: 'BAD_REQUEST', message: 'Payload inválido' })
    return
  }
  req.log?.info({ feedback: parsed.data }, 'feedback received')
  res.json({ ok: true })
})

const port = config.port
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    logger.info({ port }, 'Backend listening')
  })
}

export default app

// Diagnóstico de capacidade de streaming do modelo preferido
app.get('/diagnostics/llm', rateLimit('general'), async (req, res) => {
  const preferredModel = config.openai.modelPreferred || config.openai.model
  const fallbackModel = config.openai.modelFallback || config.openai.fallbackModel

  if (!config.openai.apiKey) {
    return res.json({
      preferredModel,
      fallbackModel,
      canStream: false,
      recommendation: 'configure api key',
      details: 'OPENAI_API_KEY não configurada',
    })
  }

  // Helper local para detectar erro de restrição de streaming
  function isStreamRestrictedError(err) {
    if (!err || err.code !== ERROR_CODES.UPSTREAM_ERROR || !err.details) return false
    const d = String(err.details)
    if (d.toLowerCase().includes('must be verified to stream this model')) return true
    if (d.toLowerCase().includes('verify organization')) return true
    try {
      const json = JSON.parse(d)
      const param = json?.error?.param
      const code = json?.error?.code
      if (param === 'stream' && code === 'unsupported_value') return true
    } catch (_) {
      /* noop */
    }
    return false
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    try {
      controller.abort(new Error('Timeout'))
    } catch (_) {}
  }, 8000)

  const startAt = Date.now()
  try {
    const body = {
      model: preferredModel,
      stream: true,
      messages: [
        { role: 'system', content: 'diagnostics' },
        { role: 'user', content: 'ping' },
      ],
      max_tokens: 1,
      temperature: 1,
    }

    const r = await fetch(`${config.openai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openai.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!r.ok) {
      let text
      try {
        text = await r.text()
      } catch (_) {
        text = ''
      }
      const error = new Error(`OpenAI API Error: ${r.status}`)
      error.status = r.status
      error.details = text
      const mapped = mapUpstreamError(error, 'OpenAI')
      const restricted = isStreamRestrictedError(mapped)
      if ((process.env.LOG_LEVEL || 'info') === 'debug' && process.env.NODE_ENV !== 'production') {
        req.log?.info(
          { status: r.status, restricted, elapsedMs: Date.now() - startAt },
          'diagnostics llm error',
        )
      }
      return res.json({
        preferredModel,
        fallbackModel,
        canStream: false,
        recommendation: restricted ? 'fallback' : 'investigate',
        errorCode: mapped.code,
        details: restricted
          ? 'Streaming não permitido para o modelo preferido nesta organização'
          : mapped.message,
      })
    }

    const ctype = typeof r.headers?.get === 'function' ? r.headers.get('content-type') || '' : ''
    const isSSE = ctype.includes('text/event-stream')

    try {
      controller.abort(new Error('done'))
    } catch (_) {}

    if ((process.env.LOG_LEVEL || 'info') === 'debug' && process.env.NODE_ENV !== 'production') {
      req.log?.info({ isSSE, elapsedMs: Date.now() - startAt }, 'diagnostics llm success')
    }

    return res.json({
      preferredModel,
      fallbackModel,
      canStream: true,
      recommendation: 'ok',
    })
  } catch (err) {
    clearTimeout(timeoutId)
    const mapped = err instanceof AppError ? err : mapUpstreamError(err, 'OpenAI')
    return res.json({
      preferredModel,
      fallbackModel,
      canStream: false,
      recommendation: 'investigate',
      errorCode: mapped.code,
      details: mapped.message,
    })
  } finally {
    clearTimeout(timeoutId)
  }
})

// Schema para criação de transcrição
const TranscriptionCreateSchema = z.object({
  audio_url: z.string().url().or(z.string().min(1)), // aceitar url pública; validação simples
  speaker_labels: z.boolean().optional(),
  language_code: z.string().optional(),
})

app.post('/transcriptions', rateLimit('general'), async (req, res) => {
  if (!config.assembly.apiKey) {
    return res
      .status(500)
      .json({ code: 'MISSING_API_KEY', message: 'ASSEMBLYAI_API_KEY não configurada' })
  }

  let parsed
  try {
    parsed = TranscriptionCreateSchema.parse(req.body)
  } catch (err) {
    return res.status(400).json({ code: 'BAD_REQUEST', message: 'Payload inválido' })
  }

  try {
    const r = await fetch(`${config.assembly.baseUrl}/transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.assembly.apiKey,
      },
      body: JSON.stringify({
        audio_url: parsed.audio_url,
        speaker_labels: parsed.speaker_labels ?? true,
        language_code: parsed.language_code ?? 'pt',
      }),
    })

    if (!r.ok) {
      const text = await r.text().catch(() => '')
      return res
        .status(502)
        .json({ code: 'UPSTREAM_ERROR', message: 'Falha ao criar transcrição', details: text })
    }

    const data = await r.json()
    return res.status(202).json({ id: data.id, status: data.status })
  } catch (err) {
    req.log?.error({ err }, 'transcriptions create error')
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro ao criar transcrição' })
  }
})

app.post('/transcriptions/upload', rateLimit('general'), async (req, res) => {
  if (!config.assembly.apiKey) {
    return res
      .status(500)
      .json({ code: 'MISSING_API_KEY', message: 'ASSEMBLYAI_API_KEY não configurada' })
  }
  try {
    // Encaminha o corpo bruto para o endpoint de upload da AssemblyAI
    const uploadRes = await fetch(`${config.assembly.baseUrl}/upload`, {
      method: 'POST',
      headers: {
        Authorization: config.assembly.apiKey,
        'Content-Type': req.headers['content-type'] || 'application/octet-stream',
      },
      body: req,
      duplex: 'half',
    })
    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => '')
      return res
        .status(502)
        .json({ code: 'UPSTREAM_ERROR', message: 'Falha ao enviar arquivo', details: text })
    }
    const uploadJson = await uploadRes.json().catch(() => ({}))
    const uploadUrl = uploadJson?.upload_url || uploadJson?.uploadUrl
    if (!uploadUrl) {
      return res
        .status(502)
        .json({ code: 'UPSTREAM_ERROR', message: 'Resposta inválida do upload' })
    }

    const r = await fetch(`${config.assembly.baseUrl}/transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: config.assembly.apiKey,
      },
      body: JSON.stringify({
        audio_url: uploadUrl,
        speaker_labels: true,
        language_code: 'pt',
      }),
    })
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      return res
        .status(502)
        .json({ code: 'UPSTREAM_ERROR', message: 'Falha ao criar transcrição', details: text })
    }
    const data = await r.json()
    return res.status(202).json({ id: data.id, status: data.status })
  } catch (err) {
    req.log?.error({ err }, 'transcriptions upload error')
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro ao processar upload' })
  }
})

app.get('/transcriptions/:id', rateLimit('general'), async (req, res) => {
  const id = req.params.id
  if (!id) return res.status(400).json({ code: 'BAD_REQUEST', message: 'ID ausente' })
  if (!config.assembly.apiKey) {
    return res
      .status(500)
      .json({ code: 'MISSING_API_KEY', message: 'ASSEMBLYAI_API_KEY não configurada' })
  }
  try {
    const r = await fetch(`${config.assembly.baseUrl}/transcript/${id}`, {
      headers: {
        Authorization: config.assembly.apiKey,
      },
    })
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      return res
        .status(502)
        .json({ code: 'UPSTREAM_ERROR', message: 'Falha ao obter transcrição', details: text })
    }
    const data = await r.json()
    return res.json(data)
  } catch (err) {
    req.log?.error({ err }, 'transcriptions get error')
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro ao obter transcrição' })
  }
})

// NOVO: Suporte a upload para Vercel Blob em dev (proxy via Vite /api -> backend)
app.options('/blob/upload', cors({ origin: config.corsOrigin }))
app.post('/blob/upload', rateLimit('general'), async (req, res) => {
  // O SDK do cliente fará uma chamada JSON para este endpoint solicitando um token
  try {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http'
    const host = req.headers.host
    const absUrl = `${proto}://${host}${req.url}`

    const body = req.body && Object.keys(req.body).length ? req.body : undefined

    const jsonResponse = await handleUpload({
      body,
      request: new Request(absUrl, {
        method: req.method,
        headers: new Headers(
          Object.fromEntries(
            Object.entries(req.headers).map(([k, v]) => [
              k,
              Array.isArray(v) ? v.join(',') : v || '',
            ]),
          ),
        ),
      }),
      onBeforeGenerateToken: async (pathname /*, clientPayload */) => {
        // TODO: autenticar/autorizar usuário antes de emitir token
        return {
          allowedContentTypes: [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/x-wav',
            'audio/webm',
            'audio/ogg',
            'audio/mp4',
            'application/octet-stream',
          ],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ purpose: 'transcription' }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          req.log?.info(
            {
              pathname: blob.pathname,
              size: blob.size,
              url: blob.url,
              tokenPayload,
            },
            'blob upload completed',
          )
        } catch (e) {
          req.log?.error({ err: String(e) }, 'blob upload onUploadCompleted error')
        }
      },
    })

    res.status(200).json(jsonResponse)
  } catch (err) {
    req.log?.error({ err: String(err), stack: err?.stack }, 'blob upload handler error')
    res
      .status(400)
      .json({ code: 'BAD_REQUEST', message: err?.message || 'Falha ao processar upload' })
  }
})
