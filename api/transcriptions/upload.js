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

  const timer = startTimer({ route: '/api/transcriptions/upload' })
  const reqId = getRequestId(req)

  const apiKey = process.env.ASSEMBLYAI_API_KEY || ''
  const baseUrl = process.env.ASSEMBLYAI_BASE_URL || 'https://api.assemblyai.com/v2'

  if (!apiKey) {
    res.status(500).json({ code: 'MISSING_API_KEY', message: 'ASSEMBLYAI_API_KEY não configurada' })
    return
  }

  if (!applyRateLimit(req, res, 'general')) return

  try {
    // Lê o corpo binário (arquivo de áudio)
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const audioBuffer = Buffer.concat(chunks)

    if (!audioBuffer || audioBuffer.length === 0) {
      res.status(400).json({ code: 'BAD_REQUEST', message: 'Arquivo de áudio ausente ou vazio' })
      return
    }

    // 1) Faz upload do arquivo para a AssemblyAI para obter um upload_url
    const uploadRes = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: audioBuffer,
    })

    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => '')
      logError('assemblyai upload upstream error', { status: uploadRes.status, details: text, reqId })
      res.status(502).json({ code: 'UPSTREAM_ERROR', message: 'Falha no upload do áudio', details: text })
      return
    }

    const uploadJson = await uploadRes.json().catch(() => null)
    const uploadUrl = uploadJson?.upload_url
    if (!uploadUrl || typeof uploadUrl !== 'string') {
      res.status(502).json({ code: 'UPSTREAM_ERROR', message: 'Resposta inválida do upload' })
      return
    }

    // 2) Cria a transcrição usando o upload_url recebido
    const createRes = await fetch(`${baseUrl}/transcript`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        audio_url: uploadUrl,
        speaker_labels: true,
        language_code: 'pt',
      }),
    })

    if (!createRes.ok) {
      const text = await createRes.text().catch(() => '')
      logError('assemblyai create transcript upstream error', { status: createRes.status, details: text, reqId })
      res.status(502).json({ code: 'UPSTREAM_ERROR', message: 'Falha ao criar transcrição', details: text })
      return
    }

    const data = await createRes.json().catch(() => null)
    if (!data?.id) {
      res.status(502).json({ code: 'UPSTREAM_ERROR', message: 'Resposta inválida ao criar transcrição' })
      return
    }

    logInfo('transcription uploaded+created', { id: data.id, reqId, ...timer.end() })
    res.status(202).json({ id: data.id, status: data.status })
  } catch (err) {
    logError('transcriptions upload error', { err: String(err), stack: err?.stack, reqId, ...timer.end() })
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Erro ao processar upload de transcrição' })
  }
}