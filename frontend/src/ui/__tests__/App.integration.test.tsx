import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from '../App'

function sseResponseFrom(lines: string[]) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const ln of lines) controller.enqueue(encoder.encode(ln))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

describe('App integração (streaming + sugestões + cancelamento + exportação)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('envia mensagem, faz streaming e exibe sugestões ao final; permite feedback e exportar', async () => {
    const origFetch = global.fetch
    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: any) => {
      const url = typeof input === 'string' ? input : (input as URL).toString()
      if (url.endsWith('/chat/stream') || url.endsWith('/api/chat/stream')) {
        // Eventos SSE: dois chunks e sugestões
        const lines = [
          'data: {"chunk":"Olá"}\n\n',
          'data: {"chunk":" mundo"}\n\n',
          'data: {"suggestions":["Próximo passo A","Próximo passo B"]}\n\n',
        ]
        return sseResponseFrom(lines)
      }
      if (url.includes('/feedback')) {
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return (origFetch as any)(input, init)
    })

    render(<App />)

    const textarea = screen.getByRole('textbox', { name: /^mensagem$/i })
    fireEvent.change(textarea, { target: { value: 'oi' } })
    fireEvent.submit(textarea.closest('form')!)

    await waitFor(() => expect(screen.getByText('Olá mundo')).toBeInTheDocument())

    // sugestões renderizadas
    await waitFor(() => expect(screen.getByRole('list')).toBeInTheDocument())
    expect(
      screen.getByRole('button', { name: 'Inserir sugestão: Próximo passo A' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Inserir sugestão: Próximo passo B' }),
    ).toBeInTheDocument()

    // feedback (up)
    const like = screen.getByRole('button', { name: /^gostei$/i })
    fireEvent.click(like)
    expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/feedback/), expect.anything())

    // exportar -> valida criação de link de download
    const createElSpy = vi.spyOn(document, 'createElement')
    const origURL = URL.createObjectURL
    const origRevoke = URL.revokeObjectURL
    // @ts-ignore
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    // @ts-ignore
    URL.revokeObjectURL = vi.fn()
    fireEvent.click(screen.getByRole('button', { name: /exportar sessão/i }))
    expect(createElSpy).toHaveBeenCalledWith('a')
    // restaura
    URL.createObjectURL = origURL
    URL.revokeObjectURL = origRevoke
  })

  it('cancela streaming ao clicar em Parar e mostra toast "Cancelado"', async () => {
    const origFetch = global.fetch
    vi.spyOn(global, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: any) => {
      const url = typeof input === 'string' ? input : (input as URL).toString()
      if (url.endsWith('/chat/stream') || url.endsWith('/api/chat/stream')) {
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              const signal: AbortSignal | undefined = init?.signal
              if (signal) {
                const onAbort = () => controller.error(new DOMException('Aborted', 'AbortError'))
                if (signal.aborted) onAbort()
                else signal.addEventListener('abort', onAbort)
              }
            },
          }),
          { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
        )
      }
      return (origFetch as any)(input, init)
    })

    render(<App />)

    const textarea = screen.getByRole('textbox', { name: /^mensagem$/i })
    fireEvent.change(textarea, { target: { value: 'oi' } })
    fireEvent.submit(textarea.closest('form')!)

    // botão parar visível durante streaming
    const stopBtn = await screen.findByRole('button', { name: /parar/i })
    fireEvent.click(stopBtn)

    // toast de cancelamento
    await waitFor(() => expect(screen.getByText(/cancelado/i)).toBeInTheDocument())
  })
})
