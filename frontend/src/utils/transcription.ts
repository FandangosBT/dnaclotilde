export interface CreateAndPollOptions {
  url: string
  apiUrl: (path: string) => string
  signal?: AbortSignal
  onStatus?: (status: string) => void
  timeoutMs?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffFactor?: number
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, ms)
    const onAbort = () => {
      cleanup()
      // Espelha o comportamento do fetch abort: lança AbortError
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const cleanup = () => {
      clearTimeout(timer)
      if (signal) signal.removeEventListener('abort', onAbort)
    }
    if (signal) {
      if (signal.aborted) {
        cleanup()
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      signal.addEventListener('abort', onAbort)
    }
  })
}

// Helper reutilizável para poll por ID
async function pollTranscription(params: {
  id: string
  apiUrl: (path: string) => string
  signal?: AbortSignal
  onStatus?: (status: string) => void
  timeoutMs?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffFactor?: number
}): Promise<string> {
  const {
    id,
    apiUrl,
    signal,
    onStatus,
    timeoutMs = 120_000,
    initialDelayMs = 1000,
    maxDelayMs = 5000,
    backoffFactor = 1.5,
  } = params

  const start = Date.now()
  let delay = initialDelayMs

  while (Date.now() - start < timeoutMs) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }

    const r = await fetch(apiUrl(`/transcriptions/${id}`), { signal })
    if (!r.ok) {
      throw new Error('POLL_FAILED')
    }
    const data = await r.json().catch(() => ({}))

    const status: string = (data as any)?.status
    if (status) onStatus?.(status)

    if (status === 'completed') {
      const text: string = (data as any)?.text || ''
      return text
    }
    if (status === 'error') {
      // Log detalhado para depuração sem expor dados sensíveis
      try {
        console.error('TRANSCRIPTION_FAILED', {
          id,
          status,
          error: (data as any)?.error,
        })
      } catch (_) {
        // noop
      }
      throw new Error('TRANSCRIPTION_FAILED')
    }

    await sleep(delay, signal)
    delay = Math.min(maxDelayMs, Math.ceil(delay * backoffFactor))
  }

  throw new Error('TIMEOUT')
}

export async function createAndPollTranscription(options: CreateAndPollOptions): Promise<string> {
  const {
    url,
    apiUrl,
    signal,
    onStatus,
    timeoutMs = 120_000,
    initialDelayMs = 1000,
    maxDelayMs = 5000,
    backoffFactor = 1.5,
  } = options

  if (!/^https?:\/\/.+/.test(url)) {
    throw new Error('INVALID_URL')
  }

  // Cria a transcrição via URL
  const createRes = await fetch(apiUrl('/transcriptions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_url: url }),
    signal,
  })
  if (!createRes.ok) {
    throw new Error('CREATE_FAILED')
  }
  const createJson = await createRes.json().catch(() => null as any)
  const id: string | undefined = createJson?.id
  if (!id) {
    throw new Error('INVALID_CREATE_RESPONSE')
  }

  // Reutiliza polling por ID
  return pollTranscription({
    id,
    apiUrl,
    signal,
    onStatus,
    timeoutMs,
    initialDelayMs,
    maxDelayMs,
    backoffFactor,
  })
}

// Opções para upload local
export interface UploadAndPollOptions {
  file: Blob
  apiUrl: (path: string) => string
  signal?: AbortSignal
  onStatus?: (status: string) => void
  timeoutMs?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffFactor?: number
}

// Faz upload do arquivo para o backend (que proxy para AssemblyAI) e faz polling
export async function uploadAndPollTranscription(options: UploadAndPollOptions): Promise<string> {
  const {
    file,
    apiUrl,
    signal,
    onStatus,
    timeoutMs = 120_000,
    initialDelayMs = 1000,
    maxDelayMs = 5000,
    backoffFactor = 1.5,
  } = options

  if (!file || (file as any).size === 0) {
    throw new Error('INVALID_FILE')
  }

  // Limite preventivo no cliente (configurável via VITE_MAX_UPLOAD_MB, padrão 500MB)
  const maxUploadMbRaw = Number((import.meta as any).env?.VITE_MAX_UPLOAD_MB)
  const MAX_UPLOAD_MB = Number.isFinite(maxUploadMbRaw) ? maxUploadMbRaw : 500
  const MAX_UPLOAD_BYTES = Math.floor(MAX_UPLOAD_MB * 1024 * 1024)
  if ((file as any).size > MAX_UPLOAD_BYTES) {
    throw new Error('FILE_TOO_LARGE')
  }

  // Upload direto do cliente para Vercel Blob
  // Import dinâmico para evitar carregar o SDK quando não utilizado
  const { upload } = await import('@vercel/blob/client')

  let blobUrl: string | null = null
  try {
    const result = await upload(
      (file as any).name || 'audio',
      file as any,
      {
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
        contentType: (file as any).type || 'application/octet-stream',
      } as any,
    )
    blobUrl = (result as any)?.url || null
  } catch (e) {
    // Normaliza erro de limite, caso o SDK reporte 413 do lado do provedor
    const msg = String((e as any)?.message || e)
    if (/413|payload too large|too large/i.test(msg)) {
      throw new Error('FILE_TOO_LARGE')
    }
    throw e
  }

  if (!blobUrl) {
    throw new Error('CREATE_FAILED')
  }

  // Reutiliza o fluxo já existente de criação+poll por URL
  return createAndPollTranscription({
    url: blobUrl,
    apiUrl,
    signal,
    onStatus,
    timeoutMs,
    initialDelayMs,
    maxDelayMs,
    backoffFactor,
  })
}
