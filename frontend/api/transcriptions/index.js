export const config = { runtime: 'nodejs' }

import { applyRateLimit } from '../_utils/rateLimit.js'
import { logError, logInfo, startTimer, getRequestId } from '../_utils/logger.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    res.status(405).json({ code: 'METHOD_NOT_ALLOWED' })
    return
  }

  const timer = startTimer({ route: '/api/transcriptions' })
  const reqId = getRequestId(req)

  const apiKey = process.env.ASSEMBLYAI_API_KEY || ''
  const baseUrl = process.env.ASSEMBLYAI_BASE_URL || 'https://api.assemblyai.com/v2'

  if (!apiKey) {
    res.status(500).json({ code: 'MISSING_API_KEY', message: 'ASSEMBLYAI_API_KEY não configurada' })
    return
  }

  if (!applyRateLimit(req, res, 'general')) return

  try {
    const body = req.body || {}
    const audio_url = body.audio_url || body.audioUrl || body.url
    if (!audio_url || typeof audio_url !== 'string') {
      res.status(400).json({ code: 'BAD_REQUEST', message: 'Informe audio_url (URL pública do áudio)' })
      return
    }

    const r = await fetch(`${baseUrl}/transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        audio_url,
        speaker_labels: body.speaker_labels ?? true,
        language_code: body.language_code || 'pt',
      }),
    })

    if (!r.ok) {
      const text = await r.text().catch(() => '')
      logError('assemblyai create transcript upstream error', { status: r.status, details: text, reqId })
      res.status(502).json({ code: 'UPSTREAM_ERROR', message: 'Falha ao criar transcrição', details: text })
      return
    }

    const data = await r.json()
    logInfo('transcription created', { id: data.id, reqId, ...timer.end() })
    res.status(202).json({ id: data.id, status: data.status })
  } catch (err) {
    logError('transcriptions create error', { err: String(err), stack: err?.stack, reqId, ...timer.end() })
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro ao criar transcrição' })
  }
}