// Utilitários de validação e limites para APIs

export const TRANSCRIPT_MAX_CHARS = Number(process.env.TRANSCRIPT_MAX_CHARS ?? 20000)

export function isSafeHttpUrl(url) {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch (_) {
    return false
  }
}

export function enforceTranscriptLimit(text, max = TRANSCRIPT_MAX_CHARS) {
  if (typeof text !== 'string') return { text: '', truncated: false, max }
  const trimmed = text.trim()
  const truncated = trimmed.length > max
  return { text: truncated ? trimmed.slice(0, max) : trimmed, truncated, max }
}

export function validateAnalyzeBody({ query, transcriptText, transcriptUrl } = {}) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return { ok: false, code: 'INVALID_BODY', message: '"query" é obrigatório' }
  }

  const hasText = typeof transcriptText === 'string' && transcriptText.trim().length > 0
  const hasUrl = typeof transcriptUrl === 'string' && isSafeHttpUrl(transcriptUrl)

  if (!hasText && !hasUrl) {
    return {
      ok: false,
      code: 'INVALID_BODY',
      message: 'Forneça transcriptText (string) ou transcriptUrl (http/https)',
    }
  }

  return { ok: true }
}
