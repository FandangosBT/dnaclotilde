import fetch from 'node-fetch'
import { config } from '../config.js'
import { buildSystemPrompt, buildUserPrompt } from './prompt.js'
import { withRetry } from '../utils/retry.js'
import { mapUpstreamError, AppError, ERROR_CODES } from '../utils/errors.js'
import { createOpenAISSEParser } from '../utils/sseParser.js'
import { streamChat as streamChatAssistants } from './assistantsAdapter.js'

export async function streamChat(
  { message, mode, tone, formality, objective, attachments },
  onChunk,
  options = {},
) {
  // Desvio para Assistants API quando configurado
  if ((config.llm?.provider || process.env.LLM_PROVIDER) === 'openai_assistants') {
    return streamChatAssistants({ message, mode, tone, formality, objective }, onChunk, options)
  }
  const { signal, timeoutMs = 60000, retryOptions = {} } = options

  const systemPrompt = buildSystemPrompt({ mode, tone, formality, objective })
  const userPrompt = buildUserPrompt(message)

  // Monta conteúdo do usuário com suporte a multimodal (texto + imagens) para modelos 4o/4.1/5 compatíveis
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0
  const userContent = hasAttachments
    ? (() => {
        const parts = []
        // Parte principal (texto do usuário)
        parts.push({ type: 'text', text: userPrompt })
        for (const att of attachments) {
          if (!att || !att.content) continue
          if (att.kind === 'text') {
            const name = att.name ? ` (${att.name})` : ''
            parts.push({
              type: 'text',
              text: `Anexo de texto${name}://\n${att.content}`,
            })
          } else if (att.kind === 'image') {
            // Suporta data URL (ex.: data:image/png;base64,...)
            parts.push({
              type: 'image_url',
              image_url: { url: att.content, detail: 'auto' },
            })
          }
        }
        return parts
      })()
    : userPrompt

  const body = {
    model: config.openai.modelPreferred || config.openai.model,
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    // token/temperature serão definidos abaixo conforme o modelo
  }

  // Definição compatível do parâmetro de tokens conforme o modelo
  try {
    const modelName = String(
      config.openai.modelPreferred || config.openai.model || '',
    ).toLowerCase()
    if (modelName.startsWith('gpt-5')) {
      body.max_completion_tokens = config.openai.maxTokens
    } else {
      body.max_tokens = config.openai.maxTokens
    }
  } catch (_) {
    // fallback seguro
    body.max_tokens = config.openai.maxTokens
  }

  // Definir temperature apenas para modelos que suportam (evitar erro no gpt-5)
  try {
    const modelName = String(
      config.openai.modelPreferred || config.openai.model || '',
    ).toLowerCase()
    if (!modelName.startsWith('gpt-5')) {
      body.temperature = config.openai.temperature
    } else if (process.env.NODE_ENV !== 'production' && config.openai.temperature !== 1) {
      // Evitar enviar temperature quando o modelo só suporta o default
      console.warn(
        `[OpenAI] Omitindo temperature=${config.openai.temperature} para modelo ${config.openai.model} (apenas valor padrão 1 é suportado)`,
      ) // eslint-disable-line no-console
    }
  } catch (_) {
    /* noop */
  }

  // Helper para detectar erro de restrição de streaming por organização
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

  // Função interna (parametrizada) que será executada com retry
  const requestStreaming = async (customBody) => {
    const controller = new AbortController()
    const onAbort = () => {
      try {
        controller.abort(signal?.reason || new Error('Aborted'))
      } catch (_) {
        /* noop */
      }
    }

    if (signal) {
      if (signal.aborted) {
        throw new AppError(ERROR_CODES.ABORTED)
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }

    const timeoutId = timeoutMs
      ? setTimeout(() => {
          try {
            controller.abort(new Error('TimeoutError'))
          } catch (_) {
            /* noop */
          }
        }, timeoutMs)
      : null

    let res
    try {
      res = await fetch(`${config.openai.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openai.apiKey}`,
        },
        body: JSON.stringify(customBody),
        signal: controller.signal,
      })
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId)
      throw mapUpstreamError(err, 'OpenAI')
    } finally {
      signal?.removeEventListener('abort', onAbort)
    }

    if (timeoutId) clearTimeout(timeoutId)

    if (!res.ok) {
      let text
      try {
        text = await res.text()
      } catch (_) {
        text = 'Unable to read response body'
      }

      const error = new Error(`OpenAI API Error: ${res.status}`)
      error.status = res.status
      error.details = text
      throw mapUpstreamError(error, 'OpenAI')
    }

    return res
  }

  // Executar com retry e backoff, com fallback automático se streaming não for permitido
  const defaultRetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    signal,
    onRetry: (error, attempt, delay) => {
      // Log retry attempts para debugging
      if ((process.env.LOG_LEVEL || 'info') === 'debug' && process.env.NODE_ENV !== 'production') {
        console.warn(`[OpenAI] Retry attempt ${attempt} after ${delay}ms due to:`, error.message)
      }
    },
  }

  let res
  try {
    res = await withRetry(() => requestStreaming(body), { ...defaultRetryOptions, ...retryOptions })
  } catch (err) {
    if (isStreamRestrictedError(err)) {
      // Aplicar fallback para modelo compatível com streaming sem verificação
      const fallbackModel =
        config.openai.fallbackModel || config.openai.modelFallback || 'gpt-4o-mini'
      const fbBody = {
        model: fallbackModel,
        stream: true,
        messages: body.messages,
        temperature: config.openai.temperature,
        max_tokens: config.openai.maxTokens,
      }
      if ((process.env.LOG_LEVEL || 'info') === 'debug' && process.env.NODE_ENV !== 'production') {
        console.warn(
          `[OpenAI] Streaming não permitido para ${body.model}; aplicando fallback para ${fallbackModel}`,
        )
      }
      res = await withRetry(() => requestStreaming(fbBody), {
        ...defaultRetryOptions,
        ...retryOptions,
      })
    } else {
      throw err
    }
  }

  // Suporte a Web Streams e Node.js Readable para parsing do SSE
  const decoder = new TextDecoder('utf-8')
  const parser = createOpenAISSEParser(onChunk)

  if (typeof res.body?.getReader === 'function') {
    // Web Streams API (ex.: global fetch no Node 18+)
    const reader = res.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      if (parser.push(text)) return
    }
    parser.flush()
  } else if (res.body && typeof res.body[Symbol.asyncIterator] === 'function') {
    // Node.js Readable Stream (ex.: node-fetch)
    for await (const chunk of res.body) {
      const text = decoder.decode(chunk, { stream: true })
      if (parser.push(text)) return
    }
    parser.flush()
  } else {
    // Fallback: tentar ler como texto (menos eficiente, mas seguro)
    try {
      const text = await res.text()
      parser.push(text)
      parser.flush()
    } catch (_) {
      /* noop */
    }
  }
}
