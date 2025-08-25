import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock config para controlar o modelo preferido
vi.mock('../src/config.js', () => ({
  config: {
    openai: {
      apiKey: 'test-key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-5',
      temperature: 0.7,
    },
  },
}))

// Mock do fetch (node-fetch) para simular respostas da OpenAI
const fetchMock = vi.fn()
vi.mock('node-fetch', () => ({
  default: (...args) => fetchMock(...args),
}))

import { streamChat } from '../src/llm/openaiClient.js'
import { ERROR_CODES } from '../src/utils/errors.js'

function makeSSEFromStrings(lines) {
  const encoder = new TextEncoder()
  const chunks = lines.map((l) => encoder.encode(l))
  let i = 0
  return {
    // Simular Node Readable com async iterator
    async *[Symbol.asyncIterator]() {
      while (i < chunks.length) {
        yield chunks[i++]
      }
    },
  }
}

describe('llm/openaiClient fallback', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  afterEach(() => {
    fetchMock.mockReset()
  })

  it('faz fallback automático para gpt-4o-mini quando streaming restrito no gpt-5', async () => {
    // 1ª chamada: 400 com mensagem de org não verificada para stream
    fetchMock.mockImplementationOnce(async () => ({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          error: {
            param: 'stream',
            code: 'unsupported_value',
            message: 'stream unsupported for this model',
          },
        }),
    }))

    // 2ª chamada (fallback): 200 com SSE mínimo
    const sseLines = ['data: {"choices":[{"delta":{"content":"Oi"}}]}\n\n', 'data: [DONE]\n\n']
    fetchMock.mockImplementationOnce(async () => ({ ok: true, body: makeSSEFromStrings(sseLines) }))

    const chunks = []
    await streamChat(
      {
        message: 'teste',
        mode: 'SDR',
        tone: 'breve',
        formality: 'informal',
        objective: 'qualificar',
      },
      (c) => chunks.push(c),
    )

    expect(chunks.join('')).toBe('Oi')
    // Verifica que duas chamadas foram feitas
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const firstCall = fetchMock.mock.calls[0]
    expect(firstCall[0]).toContain('/chat/completions')
    const firstBody = JSON.parse(firstCall[1].body)
    expect(firstBody.model).toBe('gpt-5')

    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(secondBody.model).toBe('gpt-4o-mini')
  })

  it('mapeia erro upstream quando fetch retorna 500', async () => {
    fetchMock.mockImplementationOnce(async () => ({
      ok: false,
      status: 500,
      text: async () => 'boom',
    }))
    const chunks = []
    await expect(streamChat({ message: 'oi' }, (c) => chunks.push(c))).rejects.toHaveProperty(
      'code',
      ERROR_CODES.UPSTREAM_ERROR,
    )
  })
})
