import { applyRateLimit } from '../_utils/rateLimit.js'
import { logError, logInfo, startTimer, getRequestId } from '../_utils/logger.js'
import { ok, error } from '../_utils/response.js'
import { validateAnalyzeBody, enforceTranscriptLimit, isSafeHttpUrl } from '../_utils/validation.js'

export const config = {
  runtime: 'nodejs',
}

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    return error(res, 'METHOD_NOT_ALLOWED', 'Use POST', 405)
  }

  if (!applyRateLimit(req, res, 'analyze')) return

  const reqId = getRequestId(req)
  const timer = startTimer({ route: '/api/analyze' })

  try {
    const {
      query,
      enableWeb = false,
      transcriptText,
      transcriptUrl,
      options = {},
    } = (await parseJsonSafe(req)) ?? {}

    const baseValidation = validateAnalyzeBody({ query, transcriptText, transcriptUrl })
    if (!baseValidation.ok) {
      return error(res, baseValidation.code, baseValidation.message, 400)
    }

    const language = options.language ?? 'pt-BR'
    const depth = options.depth ?? 'deep'
    const topK = clamp(Number(options.topK ?? 6), 1, 10)
    const temperature = Number(process.env.OPENAI_TEMPERATURE ?? 0.4)
    const maxTokens = Number(process.env.OPENAI_MAX_TOKENS ?? 1800)

    // Coleta de transcript
    const transcript = await resolveTranscript({ transcriptText, transcriptUrl })
    if (!transcript) {
      return error(res, 'INVALID_BODY', 'Forneça transcriptText ou transcriptUrl', 400)
    }

    // Enforçar limite de tamanho do transcript
    const limited = enforceTranscriptLimit(transcript.text)
    const transcriptResolved = limited.text
    const transcriptTruncated = limited.truncated

    // Chunking do transcript para citações com offsets
    const transcriptChunks = chunkText(transcriptResolved, { chunkSize: 800, overlap: 120 })

    // Busca Web (opcional)
    let webSnippets = []
    let webError = null
    if (enableWeb) {
      try {
        webSnippets = await tavilySearch(query, topK)
      } catch (err) {
        webError = String(err)
        logError('web search error', { err: webError, reqId })
      }
    }

    // Montagem de prompt
    const instructions = buildInstructions({ language, depth })
    const promptParts = [
      `Pergunta do usuário: ${query}`,
      `Transcript (trechos relevantes, pode ter sido truncado=${Boolean(transcriptTruncated)}):\n` +
        safeSlice(transcriptResolved, 0, 12000),
      webSnippets.length > 0
        ? `Resultados de pesquisa na Web (máx ${topK}):\n` + webSnippets.map((w, i) => `W${i + 1}. ${w.title}\nURL: ${w.url}\nTrecho: ${w.snippet}`).join('\n\n')
        : 'Sem resultados de Web ou não habilitado.',
      'Instruções: siga a estrutura e gere citações no final. Use marcadores [T#] para transcript e [W#] para Web.'
    ].join('\n\n')

    const openai = {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-4.1',
    }

    if (!openai.apiKey) {
      return error(res, 'MISSING_API_KEY', 'OPENAI_API_KEY não configurada', 500)
    }

    const messages = [
      { role: 'system', content: instructions },
      { role: 'user', content: promptParts },
    ]

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), Number(process.env.CHAT_STREAM_TIMEOUT_MS ?? 90000))

    let aiText = ''
    try {
      const r = await fetch(`${openai.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openai.apiKey}`,
        },
        body: JSON.stringify({
          model: openai.model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
        signal: controller.signal,
      })

      if (!r.ok) {
        const text = await r.text().catch(() => '')
        logError('openai upstream error (analyze)', { status: r.status, details: text, reqId })
        return error(res, 'UPSTREAM_ERROR', 'Falha ao analisar com LLM', 502, text)
      }

      const data = await r.json()
      aiText = data?.choices?.[0]?.message?.content || ''
    } finally {
      clearTimeout(timeout)
    }

    // Montar citações
    const transcriptCitations = buildTranscriptCitationsFromChunks(transcriptChunks)
    const citations = {
      transcript: transcriptCitations,
      web: webSnippets.map((w, i) => ({ id: `W${i + 1}`, url: w.url, title: w.title, snippet: w.snippet })),
      kb: [], // reservado: Assistants API com file_search
    }

    logInfo('analyze success', { reqId, webUsed: enableWeb, webCount: webSnippets.length, ...timer.end() })
    return ok(res, {
      answer: aiText,
      language,
      depth,
      truncated: { transcript: Boolean(transcriptTruncated) },
      citations,
    })
  } catch (err) {
    logError('analyze error', { err: String(err), stack: err?.stack, reqId, ...timer.end() })
    return error(res, 'INTERNAL_ERROR', 'Erro ao processar análise', 500)
  }
}

async function parseJsonSafe(req) {
  try {
    return await new Promise((resolve, reject) => {
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {})
        } catch (e) {
          reject(e)
        }
      })
      req.on('error', reject)
    })
  } catch (_) {
    return null
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function safeSlice(text, start, end) {
  if (typeof text !== 'string') return ''
  return text.slice(start, end)
}

function chunkText(text, { chunkSize = 1000, overlap = 100 } = {}) {
  const chunks = []
  if (!text || typeof text !== 'string' || chunkSize <= 0) return chunks
  let start = 0
  let id = 1
  while (start < text.length) {
    const end = Math.min(text.length, start + chunkSize)
    const snippet = text.slice(start, end)
    chunks.push({ id: `T${id}`, start, end, snippet })
    id += 1
    if (end === text.length) break
    start = Math.max(0, end - overlap)
  }
  return chunks
}

function buildTranscriptCitationsFromChunks(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) return []
  // Seleciona até 5 chunks distribuídos para citações
  const maxCites = 5
  if (chunks.length <= maxCites) return chunks
  const step = Math.floor(chunks.length / maxCites)
  const selected = []
  for (let i = 0; i < chunks.length && selected.length < maxCites; i += step) {
    selected.push(chunks[i])
  }
  return selected
}

async function resolveTranscript({ transcriptText, transcriptUrl }) {
  if (transcriptText && typeof transcriptText === 'string') {
    const text = transcriptText.trim()
    if (!text) return null
    const truncated = text.length > 20000
    return { text: truncated ? text.slice(0, 20000) : text, truncated }
  }

  if (transcriptUrl && typeof transcriptUrl === 'string') {
    if (!isSafeHttpUrl(transcriptUrl)) return null

    const r = await fetch(transcriptUrl, { method: 'GET' })
    if (!r.ok) return null
    const text = await r.text()
    const truncated = text.length > 20000
    return { text: truncated ? text.slice(0, 20000) : text, truncated }
  }

  return null
}

async function tavilySearch(query, topK) {
  const apiKey = process.env.TAVILY_API_KEY || ''
  if (!apiKey) return []

  const body = {
    query,
    max_results: topK,
    search_depth: 'advanced',
    include_answer: false,
  }

  const controller = new AbortController()
  const to = setTimeout(() => controller.abort(), 8000)
  try {
    const r = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!r.ok) return []
    const data = await r.json()
    const results = Array.isArray(data?.results) ? data.results : []
    return results.slice(0, topK).map((it) => ({
      url: it.url,
      title: it.title || it.url,
      snippet: (it.content || '').slice(0, 500),
    }))
  } finally {
    clearTimeout(to)
  }
}

function buildInstructions({ language, depth }) {
  const depthHint = depth === 'deep' ? 'Faça uma análise profunda e crítica.' : 'Seja objetivo e direto.'
  return [
    `Você é um analista sênior. Responda em ${language}. ${depthHint}`,
    'Estruture a resposta com as seções: 1) Resumo executivo; 2) Análise detalhada; 3) Evidências e Citações; 4) Riscos/Lacunas; 5) Próximos passos.',
    'Inclua citações ao final usando o formato: [T1..Tn] para Transcript (Tn referindo-se a trechos distintos) e [W1..Wn] para Web. Se não houver Web, omita [W#].',
    'Seja preciso e evite alucinações. Quando incerto, declare explicitamente a incerteza.',
  ].join('\n')
}