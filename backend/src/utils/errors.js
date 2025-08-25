/**
 * Módulo centralizado para tratamento e normalização de erros
 */

export const ERROR_CODES = {
  // Validação e entrada
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  MISSING_FIELD: 'MISSING_FIELD',

  // Autenticação e autorização
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Rate limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // Configuração
  MISSING_API_KEY: 'MISSING_API_KEY',
  INVALID_CONFIG: 'INVALID_CONFIG',

  // Upstream/LLM
  LLM_ERROR: 'LLM_ERROR',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  UPSTREAM_TIMEOUT: 'UPSTREAM_TIMEOUT',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',

  // Timeouts e cancelamento
  TIMEOUT: 'TIMEOUT',
  ABORTED: 'ABORTED',

  // Sistema
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
}

export const ERROR_MESSAGES = {
  [ERROR_CODES.BAD_REQUEST]: 'Requisição inválida',
  [ERROR_CODES.INVALID_PAYLOAD]: 'Payload inválido',
  [ERROR_CODES.MISSING_FIELD]: 'Campo obrigatório não fornecido',
  [ERROR_CODES.UNAUTHORIZED]: 'Não autorizado',
  [ERROR_CODES.FORBIDDEN]: 'Acesso negado',
  [ERROR_CODES.RATE_LIMITED]: 'Muitas requisições. Tente novamente em alguns minutos.',
  [ERROR_CODES.MISSING_API_KEY]: 'Chave da API não configurada',
  [ERROR_CODES.INVALID_CONFIG]: 'Configuração inválida',
  [ERROR_CODES.LLM_ERROR]: 'Erro no provedor de IA',
  [ERROR_CODES.UPSTREAM_ERROR]: 'Erro no serviço upstream',
  [ERROR_CODES.UPSTREAM_TIMEOUT]: 'Timeout no serviço upstream',
  [ERROR_CODES.UPSTREAM_UNAVAILABLE]: 'Serviço upstream indisponível',
  [ERROR_CODES.TIMEOUT]: 'Tempo esgotado',
  [ERROR_CODES.ABORTED]: 'Operação cancelada',
  [ERROR_CODES.INTERNAL_ERROR]: 'Erro interno do servidor',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Serviço temporariamente indisponível',
}

export const HTTP_STATUS_CODES = {
  [ERROR_CODES.BAD_REQUEST]: 400,
  [ERROR_CODES.INVALID_PAYLOAD]: 400,
  [ERROR_CODES.MISSING_FIELD]: 400,
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.RATE_LIMITED]: 429,
  [ERROR_CODES.MISSING_API_KEY]: 500,
  [ERROR_CODES.INVALID_CONFIG]: 500,
  [ERROR_CODES.LLM_ERROR]: 502,
  [ERROR_CODES.UPSTREAM_ERROR]: 502,
  [ERROR_CODES.UPSTREAM_TIMEOUT]: 504,
  [ERROR_CODES.UPSTREAM_UNAVAILABLE]: 503,
  [ERROR_CODES.TIMEOUT]: 408,
  [ERROR_CODES.ABORTED]: 499, // Client closed connection
  [ERROR_CODES.INTERNAL_ERROR]: 500,
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
}

/**
 * Classe para erros normalizados da aplicação
 */
export class AppError extends Error {
  constructor(code, message = null, details = null) {
    super(message || ERROR_MESSAGES[code] || 'Erro desconhecido')
    this.name = 'AppError'
    this.code = code
    this.details = details
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    }
  }

  getHttpStatus() {
    return HTTP_STATUS_CODES[this.code] || 500
  }
}

/**
 * Mapeia erros de upstream/fetch para códigos normalizados
 */
export function mapUpstreamError(error, context = '') {
  // Timeout/abort handling
  if (error?.name === 'AbortError' || String(error?.message || '').includes('abort')) {
    return new AppError(ERROR_CODES.ABORTED)
  }

  if (
    String(error?.message || '')
      .toLowerCase()
      .includes('timeout')
  ) {
    return new AppError(ERROR_CODES.TIMEOUT)
  }

  // Network/connectivity errors
  if (
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ENOTFOUND' ||
    error?.code === 'ECONNRESET'
  ) {
    return new AppError(ERROR_CODES.UPSTREAM_UNAVAILABLE, `Serviço ${context} indisponível`)
  }

  // HTTP status-based mapping
  if (error?.status) {
    const status = error.status
    if (status >= 500) {
      return new AppError(
        ERROR_CODES.UPSTREAM_ERROR,
        `Erro ${status} no serviço ${context}`,
        error.details,
      )
    }
    if (status === 429) {
      return new AppError(
        ERROR_CODES.RATE_LIMITED,
        `Rate limit no serviço ${context}`,
        error.details,
      )
    }
    if (status >= 400) {
      return new AppError(
        ERROR_CODES.UPSTREAM_ERROR,
        `Erro ${status} no serviço ${context}`,
        error.details,
      )
    }
  }

  // Default mapping
  return new AppError(
    ERROR_CODES.UPSTREAM_ERROR,
    `Erro no serviço ${context}: ${error?.message || 'Desconhecido'}`,
  )
}

/**
 * Middleware de tratamento de erros para Express
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err)
  }

  let normalizedError
  if (err instanceof AppError) {
    normalizedError = err
  } else {
    req.log?.error({ err }, 'Unhandled error')
    normalizedError = new AppError(ERROR_CODES.INTERNAL_ERROR)
  }

  const status = normalizedError.getHttpStatus()
  res.status(status).json(normalizedError.toJSON())
}
