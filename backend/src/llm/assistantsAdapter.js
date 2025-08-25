import fetch from 'node-fetch'
import { config } from '../config.js'
import { buildSystemPrompt, buildUserPrompt } from './prompt.js'
import { mapUpstreamError, AppError, ERROR_CODES } from '../utils/errors.js'

// Adapter para OpenAI Assistants API utilizando threads efêmeros por requisição.
// Mantém contrato: streamChat(payload, onChunk, { signal, timeoutMs })
export async function streamChat(
  { message, mode, tone, formality, objective },
  onChunk,
  options = {},
) {
  const { signal, timeoutMs = 90000 } = options

  if (!config.openai.apiKey) {
    throw new AppError(ERROR_CODES.MISSING_API_KEY, 'OPENAI_API_KEY não configurada')
  }
  if (!config.openai.assistantId) {
    throw new AppError(ERROR_CODES.INVALID_CONFIG, 'OPENAI_ASSISTANT_ID não configurado')
  }

  const systemPrompt = buildSystemPrompt({ mode, tone, formality, objective })
  const userPrompt = buildUserPrompt(message)
  const combined = [systemPrompt, userPrompt].filter(Boolean).join('\n\n')

  const controller = new AbortController()
  const onAbort = () => {
    try {
      controller.abort(signal?.reason || new Error('Aborted'))
    } catch (_) {}
  }
  if (signal) {
    if (signal.aborted) throw new AppError(ERROR_CODES.ABORTED)
    signal.addEventListener('abort', onAbort, { once: true })
  }

  const timeoutId = timeoutMs
    ? setTimeout(() => {
        try {
          controller.abort(new Error('TimeoutError'))
        } catch (_) {}
      }, timeoutMs)
    : null

  const baseUrl = config.openai.baseUrl.replace(/\/?$/, '')
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.openai.apiKey}`,
    'OpenAI-Beta': 'assistants=v2',
  }

  async function request(path, init) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: { ...headers, ...(init?.headers || {}) },
        signal: controller.signal,
      })
      if (!res.ok) {
        let text = ''
        try {
          text = await res.text()
        } catch (_) {
          /* noop */
        }
        const err = new Error(`OpenAI API Error: ${res.status}`)
        err.status = res.status
        err.details = text
        throw mapUpstreamError(err, 'OpenAI')
      }
      return res
    } catch (e) {
      throw mapUpstreamError(e, 'OpenAI')
    }
  }

  try {
    // 1) Criar thread efêmero
    const tRes = await request('/threads', { method: 'POST', body: JSON.stringify({}) })
    const thread = await tRes.json()
    const threadId = thread.id

    // 2) Postar mensagem do usuário (com o contexto atual do produto)
    await request(`/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', content: combined }),
    })

    // 3) Criar run (sem streaming nativo). Posteriormente podemos alterar para stream=true
    const runRes = await request(`/threads/${threadId}/runs`, {
      method: 'POST',
      body: JSON.stringify({ assistant_id: config.openai.assistantId }),
    })
    const run = await runRes.json()
    const runId = run.id

    // 4) Polling até completar (ou cancelar)
    const start = Date.now()
    const POLL_INTERVAL = 650
    const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'expired'])

    // Tentar cancelar run quando o cliente abortar
    let aborted = false
    const cancelOnAbort = async () => {
      aborted = true
      try {
        await request(`/threads/${threadId}/runs/${runId}/cancel`, { method: 'POST' })
      } catch (_) {
        /* noop */
      }
    }
    signal?.addEventListener('abort', cancelOnAbort, { once: true })

    let status = run.status || 'queued'
    let lastErrorMsg = ''

    while (!TERMINAL.has(status)) {
      if (controller.signal.aborted) throw new AppError(ERROR_CODES.ABORTED)
      if (signal?.aborted) throw new AppError(ERROR_CODES.ABORTED)

      await new Promise((r) => setTimeout(r, POLL_INTERVAL))
      const sRes = await request(`/threads/${threadId}/runs/${runId}`, { method: 'GET' })
      const s = await sRes.json()
      status = s.status
      if (s.last_error?.message) lastErrorMsg = s.last_error.message
      if (timeoutMs && Date.now() - start > timeoutMs) throw new AppError(ERROR_CODES.TIMEOUT)
    }

    if (status !== 'completed') {
      if (aborted || signal?.aborted || controller.signal.aborted)
        throw new AppError(ERROR_CODES.ABORTED)
      const msg = lastErrorMsg || `Run terminou com status: ${status}`
      throw new AppError(ERROR_CODES.UPSTREAM_ERROR, msg)
    }

    // 5) Buscar mensagens do thread e extrair a última resposta do assistente
    const mRes = await request(`/threads/${threadId}/messages?order=desc&limit=10`, {
      method: 'GET',
    })
    const mJson = await mRes.json()
    const messages = Array.isArray(mJson.data) ? mJson.data : []
    const assistantMsg = messages.find((m) => m.role === 'assistant') || messages[0]

    function collectText(node) {
      if (!node) return ''
      if (typeof node === 'string') return node
      if (Array.isArray(node)) return node.map(collectText).join('')
      if (typeof node === 'object') {
        // Formatos possíveis: { type: 'text', text: { value } } ou { text: '...' } ou { content: [...] }
        if (node.type === 'text' && node.text) {
          if (typeof node.text === 'string') return node.text
          if (typeof node.text.value === 'string') return node.text.value
        }
        if (typeof node.text === 'string') return node.text
        if (typeof node.value === 'string') return node.value
        let acc = ''
        for (const k of Object.keys(node)) acc += collectText(node[k])
        return acc
      }
      return ''
    }

    let fullText = ''
    if (assistantMsg?.content) {
      fullText = collectText(assistantMsg.content)
    }
    if (!fullText) {
      // Alguns formatos retornam em assistantMsg?.content[0]?.text?.value
      try {
        fullText = assistantMsg?.content?.[0]?.text?.value || ''
      } catch (_) {
        /* noop */
      }
    }
    fullText = String(fullText || '').trim()

    if (!fullText) {
      throw new AppError(ERROR_CODES.UPSTREAM_ERROR, 'Resposta vazia do Assistants API')
    }

    // 6) Enviar como streaming de forma incremental para manter contrato com o FE
    const CHUNK_SIZE = 64
    for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
      if (controller.signal.aborted || signal?.aborted) throw new AppError(ERROR_CODES.ABORTED)
      const slice = fullText.slice(i, i + CHUNK_SIZE)
      onChunk(slice)
      // Pequeno atraso para dar percepção de streaming e evitar congestionar
      await new Promise((r) => setTimeout(r, 10))
    }

    return
  } catch (err) {
    throw err instanceof AppError ? err : mapUpstreamError(err, 'OpenAI')
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
    signal?.removeEventListener?.('abort', onAbort)
  }
}
