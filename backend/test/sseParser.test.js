import { describe, it, expect, vi } from 'vitest'
import { createOpenAISSEParser } from '../src/utils/sseParser.js'

function frame(lines) {
  return lines.map((l) => l + '\n').join('')
}

describe('createOpenAISSEParser', () => {
  it('emite deltas de content conforme frames data: chegam', () => {
    const chunks = []
    const parser = createOpenAISSEParser((d) => chunks.push(d))

    const part1 = frame(['data: {"id":"cmpl","choices":[{"delta":{"content":"Olá"}}]}', ''])
    const part2 = frame([
      'data: {"id":"cmpl","choices":[{"delta":{"content":" mundo"}}]}',
      'data: [DONE]',
      '',
    ])

    expect(parser.push(part1)).toBe(false)
    expect(parser.push(part2)).toBe(true)
    expect(chunks.join('')).toBe('Olá mundo')
  })

  it('tolera linhas parciais divididas em múltiplos pushes', () => {
    const chunks = []
    const parser = createOpenAISSEParser((d) => chunks.push(d))

    const partial = 'data: {"choices":[{"delta":{"content":"A"}}]}'
    const rest = '\n\ndata: {"choices":[{"delta":{"content":"B"}}]}\n\n'

    expect(parser.push(partial)).toBe(false)
    expect(parser.push(rest)).toBe(false)
    parser.flush()

    expect(chunks.join('')).toBe('AB')
  })

  it('ignora JSON inválido e continua', () => {
    const chunks = []
    const parser = createOpenAISSEParser((d) => chunks.push(d))

    const payload = frame(['data: {invalid}', 'data: {"choices":[{"delta":{"content":"ok"}}]}', ''])

    expect(parser.push(payload)).toBe(false)
    parser.flush()

    expect(chunks.join('')).toBe('ok')
  })
})
