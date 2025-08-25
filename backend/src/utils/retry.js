/**
 * Utilitários para retry com backoff exponencial
 */

import { AppError, ERROR_CODES } from './errors.js'

/**
 * Configuração padrão para retry
 */
const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterMs: 100,
  retryableErrors: [
    ERROR_CODES.UPSTREAM_TIMEOUT,
    ERROR_CODES.UPSTREAM_UNAVAILABLE,
    ERROR_CODES.TIMEOUT,
    'ECONNRESET',
    'ECONNREFUSED',
    'ENOTFOUND',
  ],
}

/**
 * Verifica se um erro é retryable
 */
function isRetryableError(error, retryableErrors) {
  if (!error) return false

  // AppError com código retryable
  if (error.code && retryableErrors.includes(error.code)) {
    return true
  }

  // Network errors
  if (error.code && retryableErrors.includes(error.code)) {
    return true
  }

  // HTTP 5xx status codes
  if (error.status >= 500 && error.status < 600) {
    return true
  }

  // Rate limits (429) são retryable
  if (error.status === 429) {
    return true
  }

  return false
}

/**
 * Calcula delay com backoff exponencial e jitter
 */
function calculateDelay(attempt, baseDelayMs, maxDelayMs, backoffMultiplier, jitterMs) {
  const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1)
  const jitter = Math.random() * jitterMs
  return Math.min(exponentialDelay + jitter, maxDelayMs)
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Executa uma função com retry e backoff exponencial
 *
 * @param {Function} fn - Função assíncrona a ser executada
 * @param {Object} options - Opções de retry
 * @param {AbortSignal} options.signal - Signal para cancelamento
 * @param {number} options.maxAttempts - Número máximo de tentativas
 * @param {number} options.baseDelayMs - Delay base em milliseconds
 * @param {number} options.maxDelayMs - Delay máximo em milliseconds
 * @param {number} options.backoffMultiplier - Multiplicador para backoff exponencial
 * @param {number} options.jitterMs - Jitter aleatório em milliseconds
 * @param {Array} options.retryableErrors - Lista de códigos de erro retryable
 * @param {Function} options.onRetry - Callback executado antes de cada retry
 * @returns {Promise} Resultado da função ou erro
 */
export async function withRetry(fn, options = {}) {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options }
  const {
    signal,
    maxAttempts,
    baseDelayMs,
    maxDelayMs,
    backoffMultiplier,
    jitterMs,
    retryableErrors,
    onRetry,
  } = config

  let lastError = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Verificar cancelamento antes de cada tentativa
    if (signal?.aborted) {
      throw new AppError(ERROR_CODES.ABORTED)
    }

    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Não retry na última tentativa
      if (attempt === maxAttempts) {
        break
      }

      // Verificar se o erro é retryable
      if (!isRetryableError(error, retryableErrors)) {
        break
      }

      // Calcular delay para próxima tentativa
      const delay = calculateDelay(attempt, baseDelayMs, maxDelayMs, backoffMultiplier, jitterMs)

      // Chamar callback de retry se fornecido
      if (onRetry) {
        try {
          await onRetry(error, attempt, delay)
        } catch (_) {
          // Ignorar erros no callback
        }
      }

      // Sleep com verificação de cancelamento
      const sleepPromise = sleep(delay)
      if (signal) {
        await Promise.race([
          sleepPromise,
          new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(new AppError(ERROR_CODES.ABORTED)), {
              once: true,
            })
          }),
        ])
      } else {
        await sleepPromise
      }
    }
  }

  // Todas as tentativas falharam
  throw lastError || new AppError(ERROR_CODES.INTERNAL_ERROR)
}

/**
 * Cria uma versão retryable de uma função
 *
 * @param {Function} fn - Função a ser wrapped
 * @param {Object} defaultOptions - Opções padrão de retry
 * @returns {Function} Versão retryable da função
 */
export function retryable(fn, defaultOptions = {}) {
  return async function (...args) {
    // O último argumento pode ser as opções de retry
    let options = defaultOptions
    if (
      args.length > 0 &&
      typeof args[args.length - 1] === 'object' &&
      args[args.length - 1].maxAttempts !== undefined
    ) {
      options = { ...defaultOptions, ...args.pop() }
    }

    return withRetry(() => fn(...args), options)
  }
}
