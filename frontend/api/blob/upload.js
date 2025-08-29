export const config = { runtime: 'nodejs' }

import { handleUpload } from '@vercel/blob/client'
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

  const timer = startTimer({ route: '/api/blob/upload' })
  const reqId = getRequestId(req)

  if (!applyRateLimit(req, res, 'general')) return

  try {
    const body = await parseJsonSafe(req)

    const jsonResponse = await handleUpload({
      body,
      request: new Request(
        `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}${req.url}`,
        {
          method: req.method,
          headers: new Headers(
            Object.fromEntries(
              Object.entries(req.headers).map(([k, v]) => [
                k,
                Array.isArray(v) ? v.join(',') : (v ?? ''),
              ]),
            ),
          ),
        },
      ),
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
          tokenPayload: JSON.stringify({ purpose: 'transcription', reqId }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        try {
          logInfo('blob upload completed', {
            pathname: blob.pathname,
            size: blob.size,
            url: blob.url,
            tokenPayload,
            reqId,
          })
        } catch (e) {
          logError('blob upload onUploadCompleted error', { err: String(e), reqId })
        }
      },
    })

    logInfo('blob upload token issued', { reqId, ...timer.end() })
    res.status(200).json(jsonResponse)
  } catch (err) {
    logError('blob upload handler error', {
      err: String(err),
      stack: err?.stack,
      reqId,
      ...timer.end(),
    })
    res
      .status(400)
      .json({ code: 'BAD_REQUEST', message: (err && err.message) || 'Falha ao processar upload' })
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
