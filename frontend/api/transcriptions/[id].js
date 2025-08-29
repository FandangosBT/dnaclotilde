export const config = { runtime: 'nodejs' }

import { applyRateLimit } from '../_utils/rateLimit.js'
import { logError, logInfo, startTimer, getRequestId } from '../_utils/logger.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS')
    res.status(405).json({ code: 'METHOD_NOT_ALLOWED' })
    return
  }

  const timer = startTimer({ route: '/api/transcriptions/[id]' })
  const reqId = getRequestId(req)

  const apiKey = process.env.ASSEMBLYAI_API_KEY || ''
  const baseUrl = process.env.ASSEMBLYAI_BASE_URL || 'https://api.assemblyai.com/v2'

  if (!apiKey) {
    res.status(500).json({ code: 'MISSING_API_KEY', message: 'ASSEMBLYAI_API_KEY não configurada' })
    return
  }

  if (!applyRateLimit(req, res, 'general')) return

  const { id } = req.query || {}
  if (!id || typeof id !== 'string') {
    res.status(400).json({ code: 'BAD_REQUEST', message: 'ID ausente' })
    return
  }

  try {
    const r = await fetch(`${baseUrl}/transcript/${id}`, {
      headers: { Authorization: apiKey },
    })

    if (!r.ok) {
      const text = await r.text().catch(() => '')
      logError('assemblyai get transcript upstream error', {
        status: r.status,
        details: text,
        id,
        reqId,
      })
      res
        .status(502)
        .json({ code: 'UPSTREAM_ERROR', message: 'Falha ao obter transcrição', details: text })
      return
    }

    const data = await r.json()
    const out = {
      id: data.id,
      status: data.status,
      text: data.text,
      utterances: data.utterances,
      language_code: data.language_code,
      error: data.error,
    }
    logInfo('transcription fetched', { id, status: out.status, reqId, ...timer.end() })
    res.json(out)
  } catch (err) {
    logError('transcriptions get error', {
      err: String(err),
      stack: err?.stack,
      id,
      reqId,
      ...timer.end(),
    })
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro ao consultar transcrição' })
  }
}
