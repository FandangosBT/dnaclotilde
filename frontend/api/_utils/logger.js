import { randomUUID } from 'crypto'

function ts() {
  return new Date().toISOString()
}

export function logInfo(message, fields = {}) {
  try {
    console.log(JSON.stringify({ level: 'info', msg: message, timestamp: ts(), ...fields }))
  } catch {
    console.log(`[info] ${ts()} ${message}`)
  }
}

export function logError(message, fields = {}) {
  try {
    console.error(JSON.stringify({ level: 'error', msg: message, timestamp: ts(), ...fields }))
  } catch {
    console.error(`[error] ${ts()} ${message}`)
  }
}

export function startTimer(extra = {}) {
  const start = Date.now()
  return {
    start,
    end: (more = {}) => {
      return { elapsedMs: Date.now() - start, ...extra, ...more }
    },
  }
}

export function getRequestId(req) {
  try {
    const h = req?.headers || {}
    const id =
      h['x-request-id'] ||
      h['x-requestid'] ||
      h['x-correlation-id'] ||
      h['x-amzn-trace-id'] ||
      randomUUID()
    return String(id)
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  }
}
