import { describe, it, expect } from 'vitest'
import { parseSSEChunk, processSSEEvents } from '../sse'

describe('parseSSEChunk', () => {
  it('parseia múltiplos eventos com chunk e message', () => {
    const input = [
      'data: {"chunk":"Olá"}',
      '',
      'data: {"chunk":" mundo"}',
      '',
      'data: {"message":"fim"}',
      '',
    ].join('\n')

    const events = parseSSEChunk(input)
    expect(events).toHaveLength(3)
    const { chunks, lastMessage } = processSSEEvents(events)
    expect(chunks.join('')).toBe('Olá mundo')
    expect(lastMessage).toBe('fim')
  })

  it('ignora linhas inválidas/keep-alives', () => {
    const input = [
      ': keep-alive',
      '',
      'data: ping', // não é JSON
      '',
      'event: end',
      'data: {"message":"encerrado"}',
      '',
    ].join('\n')

    const events = parseSSEChunk(input)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({ message: 'encerrado' })
  })

  it('retorna array vazio quando não há data: json válido', () => {
    const input = ['event: token', 'id: 1', '', ': comentário', ''].join('\n')
    expect(parseSSEChunk(input)).toEqual([])
  })
})
