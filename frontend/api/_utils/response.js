// Utilitários de resposta padronizada para funções serverless
// success: { ok: true, data, hints? }
// error:   { ok: false, code, message, details? }

export function ok(res, data = {}, hints = []) {
  try {
    if (Array.isArray(hints) && hints.length > 0) {
      return res.status(200).json({ ok: true, data, hints })
    }
    return res.status(200).json({ ok: true, data })
  } catch (_) {
    // fallback em caso de erro na serialização
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ ok: true, data }))
  }
}

export function error(res, code, message, httpStatus = 400, details) {
  const payload = { ok: false, code, message }
  if (details !== undefined) payload.details = details
  try {
    return res.status(httpStatus).json(payload)
  } catch (_) {
    res.statusCode = httpStatus
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(payload))
  }
}
