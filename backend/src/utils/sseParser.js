// Utilitário para parsing de SSE do OpenAI Chat Completions
// Mantém estado mínimo (buffer) e expõe uma API simples para alimentar texto decodificado
// e emitir deltas de conteúdo via callback.

export function createOpenAISSEParser(onChunk) {
  let buffer = ''

  function processBuffer() {
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (trimmed.startsWith('data:')) {
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') return true
        try {
          const json = JSON.parse(data)
          const delta = json.choices?.[0]?.delta?.content
          if (delta) onChunk(delta)
        } catch (_) {
          // Ignorar erros de parse para linhas parciais ou heartbeats
        }
      }
    }
    return false
  }

  return {
    // Alimenta o parser com texto (já decodificado) e retorna se encontrou [DONE]
    push(text) {
      buffer += text
      return processBuffer()
    },
    // Força processar qualquer resto em buffer (útil ao final de streams)
    flush() {
      return processBuffer()
    },
  }
}
