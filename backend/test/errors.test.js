import { describe, it, expect } from 'vitest'
import {
  AppError,
  ERROR_CODES,
  HTTP_STATUS_CODES,
  ERROR_MESSAGES,
  mapUpstreamError,
} from '../src/utils/errors.js'

describe('utils/errors', () => {
  it('AppError serializa corretamente e retorna status HTTP', () => {
    const err = new AppError(ERROR_CODES.RATE_LIMITED, null, { retryAfter: 10 })
    expect(err.toJSON()).toEqual({
      code: 'RATE_LIMITED',
      message: ERROR_MESSAGES.RATE_LIMITED,
      details: { retryAfter: 10 },
    })
    expect(err.getHttpStatus()).toBe(HTTP_STATUS_CODES.RATE_LIMITED)
  })

  it('mapUpstreamError mapeia Abort/timeout corretamente', () => {
    const aborted = mapUpstreamError({ name: 'AbortError' }, 'OpenAI')
    expect(aborted.code).toBe(ERROR_CODES.ABORTED)

    const timeout = mapUpstreamError({ message: 'Request timeout exceeded' }, 'OpenAI')
    expect(timeout.code).toBe(ERROR_CODES.TIMEOUT)
  })

  it('mapUpstreamError mapeia erros de rede e HTTP status', () => {
    const conn = mapUpstreamError({ code: 'ECONNREFUSED' }, 'OpenAI')
    expect(conn.code).toBe(ERROR_CODES.UPSTREAM_UNAVAILABLE)

    const http500 = mapUpstreamError({ status: 500 }, 'OpenAI')
    expect(http500.code).toBe(ERROR_CODES.UPSTREAM_ERROR)

    const http429 = mapUpstreamError({ status: 429 }, 'OpenAI')
    expect(http429.code).toBe(ERROR_CODES.RATE_LIMITED)

    const http400 = mapUpstreamError({ status: 400 }, 'OpenAI')
    expect(http400.code).toBe(ERROR_CODES.UPSTREAM_ERROR)
  })
})
