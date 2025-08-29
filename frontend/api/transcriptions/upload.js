export const config = { runtime: 'nodejs' }

import { applyRateLimit } from '../_utils/rateLimit.js'
import { logError, logInfo, startTimer, getRequestId } from '../_utils/logger.js'

export default async function handler(req, res) {
  // Este endpoint foi descontinuado em favor de upload direto ao Vercel Blob.
  // Mantenha por enquanto para não quebrar clientes antigos.
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  res.status(410).json({
    code: 'ENDPOINT_DEPRECATED',
    message:
      'Use upload direto ao Vercel Blob via /api/blob/upload e forneça a URL ao criar a transcrição.',
  })
}
