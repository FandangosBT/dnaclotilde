import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAndPollTranscription } from '../transcription'

const ok = (data: any) => ({ ok: true, json: async () => data }) as Response
const notOk = () => ({ ok: false, json: async () => ({}) }) as Response

declare const global: any

describe('createAndPollTranscription', () => {
  const apiUrl = (p: string) => `http://localhost${p}`
  let fetchMock: any

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock = vi.fn()
    ;(global as any).fetch = fetchMock
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('falha com URL inválida', async () => {
    await expect(createAndPollTranscription({ url: 'foo', apiUrl })).rejects.toThrowError(
      'INVALID_URL',
    )
  })

  it('cria e conclui transcrição com sucesso, chamando onStatus', async () => {
    // 1ª chamada: create
    fetchMock.mockResolvedValueOnce(ok({ id: 'abc' }))
    // polling: processing -> completed
    fetchMock.mockResolvedValueOnce(ok({ status: 'processing' }))
    fetchMock.mockResolvedValueOnce(ok({ status: 'completed', text: 'olá mundo' }))

    const statuses: string[] = []
    const promise = createAndPollTranscription({
      url: 'http://audio',
      apiUrl,
      onStatus: (s) => statuses.push(s),
      initialDelayMs: 1000,
      maxDelayMs: 2000,
      backoffFactor: 1.2,
      timeoutMs: 10_000,
    })

    // avança o sleep do primeiro ciclo de polling
    await vi.advanceTimersByTimeAsync(1000)

    const text = await promise
    expect(text).toBe('olá mundo')
    expect(statuses).toEqual(['processing', 'completed'])
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('propaga erro de criação', async () => {
    fetchMock.mockResolvedValueOnce(notOk())
    await expect(createAndPollTranscription({ url: 'http://audio', apiUrl })).rejects.toThrowError(
      'CREATE_FAILED',
    )
  })

  it('propaga resposta inválida de criação', async () => {
    fetchMock.mockResolvedValueOnce(ok({}))
    await expect(createAndPollTranscription({ url: 'http://audio', apiUrl })).rejects.toThrowError(
      'INVALID_CREATE_RESPONSE',
    )
  })

  it('propaga erro ao consultar (poll)', async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: 'abc' }))
    fetchMock.mockResolvedValueOnce(notOk())
    await expect(createAndPollTranscription({ url: 'http://audio', apiUrl })).rejects.toThrowError(
      'POLL_FAILED',
    )
  })

  it('propaga erro de transcrição quando status é error', async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: 'abc' }))
    fetchMock.mockResolvedValueOnce(ok({ status: 'error', error: 'x' }))
    await expect(createAndPollTranscription({ url: 'http://audio', apiUrl })).rejects.toThrowError(
      'TRANSCRIPTION_FAILED',
    )
  })

  it('respeita timeout', async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: 'abc' }))
    // sempre processing
    fetchMock.mockResolvedValue(ok({ status: 'processing' }))

    const p = createAndPollTranscription({
      url: 'http://audio',
      apiUrl,
      initialDelayMs: 100,
      maxDelayMs: 100,
      timeoutMs: 250,
    })

    // Anexa o handler de rejeição ANTES de avançar o tempo para evitar unhandled rejection
    const assertion = expect(p).rejects.toThrowError('TIMEOUT')

    // avança o suficiente para exceder o timeout (>= 300ms)
    await vi.advanceTimersByTimeAsync(100)
    await vi.advanceTimersByTimeAsync(200)

    await assertion
  })

  it('cancela via AbortController (AbortError)', async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: 'abc' }))
    // primeiro poll retorna processing, depois abortamos durante o sleep
    fetchMock.mockResolvedValue(ok({ status: 'processing' }))

    const controller = new AbortController()
    const promise = createAndPollTranscription({
      url: 'http://audio',
      apiUrl,
      signal: controller.signal,
      initialDelayMs: 1000,
      maxDelayMs: 1000,
      timeoutMs: 10_000,
    })

    // deixa entrar no sleep e aborta
    await vi.advanceTimersByTimeAsync(10)
    controller.abort()
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
  })
})
