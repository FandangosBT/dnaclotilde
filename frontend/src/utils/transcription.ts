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

  const createRes = await fetch(apiUrl('/transcriptions/upload'), {
    method: 'POST',
    headers: { 'Content-Type': (file as any).type || 'application/octet-stream' },
    body: file,
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