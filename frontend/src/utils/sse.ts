/**
 * Utilitário para parsing de chunks SSE (Server-Sent Events)
 */

export interface SSEEvent {
  chunk?: string
  message?: string
  code?: string
  suggestions?: string[]
}

/**
 * Parseia um chunk de texto recebido do stream SSE
 * @param chunk - Texto bruto recebido do ReadableStream
 * @returns Array de eventos SSE parseados
 */
export function parseSSEChunk(chunk: string): SSEEvent[] {
  const events: SSEEvent[] = []

  // Divide por eventos (separados por dupla quebra de linha)
  const rawEvents = chunk.split('\n\n').filter(Boolean)

  for (const rawEvent of rawEvents) {
    const lines = rawEvent.split('\n')
    const dataLine = lines.find((line) => line.startsWith('data:'))

    if (!dataLine) continue

    try {
      const jsonStr = dataLine.slice(5).trim() // Remove "data:" prefix
      const data = JSON.parse(jsonStr) as SSEEvent
      events.push(data)
    } catch (_) {
      // Ignora linhas que não são JSON válido (como keep-alives)
      continue
    }
  }

  return events
}

/**
 * Processa eventos SSE e retorna informações consolidadas
 * @param events - Array de eventos SSE
 * @returns Objeto com chunks recebidos e última mensagem de erro
 */
export function processSSEEvents(events: SSEEvent[]): {
  chunks: string[]
  lastMessage: string | null
  suggestions: string[]
} {
  const chunks: string[] = []
  let lastMessage: string | null = null
  let suggestions: string[] = []

  for (const event of events) {
    if (event.chunk) {
      chunks.push(event.chunk)
    } else if (event.message) {
      lastMessage = event.message
    } else if (event.suggestions && Array.isArray(event.suggestions)) {
      suggestions = event.suggestions
    }
  }

  return { chunks, lastMessage, suggestions }
}
