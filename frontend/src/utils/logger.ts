export type UXMetrics = {
  firstTokenMs?: number
  totalMs?: number
  chunks?: number
  chars?: number
  error?: boolean
}

const isDev = import.meta.env.MODE !== 'production'

/**
 * Logger de telemetria UX sem PII.
 * Em desenvolvimento: faz console.info. Produção: placeholder para futura coleta.
 */
export function logUX(metrics: UXMetrics) {
  const payload = {
    firstTokenMs: metrics.firstTokenMs ?? null,
    totalMs: metrics.totalMs ?? null,
    chunks: metrics.chunks ?? 0,
    chars: metrics.chars ?? 0,
    error: !!metrics.error,
    ts: new Date().toISOString(),
  }
  if (isDev) {
    // eslint-disable-next-line no-console
    console.info('[ux]', payload)
  }
  // Futuramente: navigator.sendBeacon('/api/telemetry', JSON.stringify(payload))
}