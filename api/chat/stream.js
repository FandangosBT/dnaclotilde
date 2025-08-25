export const config = {
  runtime: 'nodejs',
}

const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  model: process.env.OPENAI_MODEL || 'gpt-4.1',
  temperature: Number(process.env.OPENAI_TEMPERATURE ?? 0.7),
  maxTokens: Number(process.env.OPENAI_MAX_TOKENS ?? 800),
}

function buildSystemPrompt({ mode = 'SDR', tone = 'breve', formality = 'informal' }) {
  const role = mode === 'Closer' ? 'um Closer' : 'um SDR'
  return [
    `Você é ${role} especialista em vendas B2B SaaS.`,
    `Estilo: ${tone}; Formalidade: ${formality}.`,
    `Responda de forma objetiva, com passos acionáveis, e com foco em resultados.`,
    `Se faltar contexto, faça perguntas claras para preencher lacunas.`,
    `Nunca invente dados. Não use jargão excessivo.`,
  ].join('\n')
}

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
  if (mode === 'Closer' && objective === 'qualificar') {
    return [
      'Validar decisores do comitê',
      'Confirmar critérios de compra',
      'Propor call com sponsor',
    ]
  }
  return list.slice(0, 3)
}

async function streamChat({ message, mode, tone, formality }, { signal } = {}) {
  const systemPrompt = buildSystemPrompt({ mode, tone, formality })

  const body = {
    model: openaiConfig.model,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    temperature: openaiConfig.temperature,
    max_tokens: openaiConfig.maxTokens,
  }

  const res = await fetch(`${openaiConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiConfig.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI Error: ${res.status} ${text}`)
  }

  return res.body
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' })
  }

  const {
    message,
    mode = 'SDR',
    tone = 'breve',
    formality = 'informal',
    objective = 'qualificar',
  } = req.body

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ code: 'BAD_REQUEST', message: 'Message is required' })
  }

  if (!openaiConfig.apiKey) {
    return res
      .status(500)
      .json({ code: 'MISSING_API_KEY', message: 'OPENAI_API_KEY não configurada' })
  }

  // Controle de cancelamento e timeout
  const controller = new AbortController()
  let timedOut = false
  let abortedByClient = false
  const timeoutMs = Number(process.env.CHAT_STREAM_TIMEOUT_MS ?? 90000)
  const timeoutId = setTimeout(() => {
    timedOut = true
    try {
      controller.abort(new Error('Timeout'))
    } catch {}
  }, timeoutMs)

  req.on?.('close', () => {
    abortedByClient = true
    try {
      controller.abort(new Error('Client disconnected'))
    } catch {}
  })

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  })

  const heartbeat = setInterval(() => {
    res.write(`event: ping\n`)
    res.write(`data: \n\n`)
  }, 15000)

  let hadChunks = false
  try {
    const stream = await streamChat(
      { message, mode, tone, formality },
      { signal: controller.signal },
    )
    const reader = stream.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (trimmed.startsWith('data:')) {
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') break
          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content
            if (delta) {
              hadChunks = true
              res.write(`data: ${JSON.stringify({ chunk: delta })}\n\n`)
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    }

    if (hadChunks) {
      const suggestions = generateSuggestions(objective, mode)
      if (suggestions?.length) {
        res.write('event: suggestions\n')
        res.write(`data: ${JSON.stringify({ suggestions })}\n\n`)
      }
    }
  } catch (err) {
    const code = timedOut ? 'TIMEOUT' : abortedByClient ? 'ABORTED' : 'LLM_ERROR'
    const message =
      code === 'TIMEOUT'
        ? 'Tempo esgotado'
        : code === 'ABORTED'
          ? 'Cancelado'
          : 'Erro no provedor LLM'
    res.write(`event: error\n`)
    res.write(`data: ${JSON.stringify({ code, message })}\n\n`)
  } finally {
    clearInterval(heartbeat)
    clearTimeout(timeoutId)
    res.write('event: end\n')
    res.write('data: {}\n\n')
    res.end()
  }
}