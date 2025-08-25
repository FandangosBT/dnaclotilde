import request from 'supertest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import app from '../src/index.js'
import { AppError, ERROR_CODES } from '../src/utils/errors.js'

// Mock do cliente OpenAI para não realizar chamadas externas
vi.mock('../src/llm/openaiClient.js', () => {
  return {
    streamChat: vi.fn(),
  }
})

import { streamChat } from '../src/llm/openaiClient.js'

describe('POST /chat/stream (Express + SSE)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Manter o mock de streamChat ativo entre os testes
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('streaming feliz: emite chunks SSE, suggestions e finaliza com event: end', async () => {
    streamChat.mockImplementation(async (payload, onChunk) => {
      onChunk('Olá')
      onChunk(', ')
      onChunk('mundo!')
      return
    })

    const res = await request(app).post('/chat/stream').send({
      message: 'teste',
      mode: 'SDR',
      tone: 'breve',
      formality: 'informal',
      objective: 'qualificar',
    })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')

    const body = res.text
    expect(body).toContain('event: open')
    expect(body).toContain('data: {')
    expect(body).toContain('data: {"chunk":"Olá"}')
    expect(body).toContain('data: {"chunk":", "}')
    expect(body).toContain('data: {"chunk":"mundo!"}')
    // suggestions são geradas quando houve chunks
    expect(body).toContain('event: suggestions')
    // No fluxo feliz não deve haver event:error
    expect(body).not.toContain('event: error')
    expect(body).toContain('event: end')

    expect(streamChat).toHaveBeenCalledTimes(1)
  })

  it('erro de validação: sem message -> envia event: error e finaliza', async () => {
    streamChat.mockClear()

    const res = await request(app).post('/chat/stream').send({})

    // O endpoint já enviou cabeçalhos SSE, portanto status 200 com evento de erro
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/event-stream')

    const body = res.text
    expect(body).toContain('event: error')
    expect(body).toContain('"code":"BAD_REQUEST"')
    expect(body).toContain('Payload inválido')
    expect(body).toContain('event: end')

    expect(streamChat).not.toHaveBeenCalled()
  })

  it('erro upstream: propaga como event: error com code UPSTREAM_ERROR e finaliza', async () => {
    streamChat.mockImplementationOnce(async () => {
      throw new AppError(ERROR_CODES.UPSTREAM_ERROR, 'Erro 500 no serviço OpenAI')
    })

    const res = await request(app).post('/chat/stream').send({ message: 'falhar' })

    expect(res.status).toBe(200)
    const body = res.text
    expect(body).toContain('event: error')
    expect(body).toContain('"code":"UPSTREAM_ERROR"')
    expect(body).toContain('event: end')
  })
})
