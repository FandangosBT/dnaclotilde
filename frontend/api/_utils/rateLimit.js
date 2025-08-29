// Rate limiting básico em memória para funções serverless (não distribuído)
const WINDOW_MS = 5 * 60 * 1000 // 5 minutos
const LIMITS = { general: 60, chat: 30 }

// ip -> { start: number, countGeneral: number, countChat: number }
const buckets = new Map()

export function getIp(req) {
  const xf = req.headers?.['x-forwarded-for']
  if (typeof xf === 'string' && xf.length > 0) return xf.split(',')[0].trim()
  return (
    req.socket?.remoteAddress || req.connection?.remoteAddress || req.headers?.['x-real-ip'] ||
    'unknown'
  )
}

export function applyRateLimit(req, res, kind = 'general') {
  try {
    if (process.env.NODE_ENV === 'test') return true

    const now = Date.now()
    const ip = getIp(req)

    let bucket = buckets.get(ip)
    if (!bucket || now - bucket.start >= WINDOW_MS) {
      bucket = { start: now, countGeneral: 0, countChat: 0 }
      buckets.set(ip, bucket)
    }

    const limit = LIMITS[kind] || LIMITS.general
    const key = kind === 'chat' ? 'countChat' : 'countGeneral'

    bucket[key] += 1

    const remaining = Math.max(0, limit - bucket[key])
    const resetIn = Math.max(0, WINDOW_MS - (now - bucket.start))

    // Headers informativos
    try {
      res.setHeader('X-RateLimit-Limit', String(limit))
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)))
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetIn / 1000)))
    } catch (_) {}

    if (bucket[key] > limit) {
      try {
        res.setHeader('Retry-After', String(Math.ceil(resetIn / 1000)))
      } catch (_) {}
      res.status(429).json({ code: 'RATE_LIMITED', message: 'Muitas requisições, tente novamente em instantes.' })
      return false
    }

    return true
  } catch (_) {
    // Em caso de erro no limiter, nunca bloqueie a requisição
    return true
  }
}