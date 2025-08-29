import { test, expect, type Page } from '@playwright/test'

// Helper para injetar mock de fetch com SSE
async function mockSSE(page: Page, mode: 'finish' | 'infinite') {
  await page.addInitScript(
    ({ mode }) => {
      const origFetch = window.fetch
      // @ts-ignore
      window.fetch = (input: RequestInfo | URL, init?: any) => {
        const url = typeof input === 'string' ? input : (input as URL).toString()
        if (url.endsWith('/api/chat/stream') || url.endsWith('/chat/stream')) {
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              const encoder = new TextEncoder()
              const signal: AbortSignal | undefined = init?.signal
              if (signal) {
                const onAbort = () => controller.error(new DOMException('Aborted', 'AbortError'))
                if (signal.aborted) onAbort()
                else signal.addEventListener('abort', onAbort)
              }
              if (mode === 'finish') {
                controller.enqueue(encoder.encode('data: {"chunk":"Olá"}\n\n'))
                setTimeout(
                  () => controller.enqueue(encoder.encode('data: {"chunk":" mundo"}\n\n')),
                  40,
                )
                setTimeout(
                  () =>
                    controller.enqueue(
                      encoder.encode('data: {"suggestions":["Próximo A","Próximo B"]}\n\n'),
                    ),
                  80,
                )
                setTimeout(() => controller.close(), 120)
              } else {
                // Mantém a conexão aberta com keep-alives
                const id = setInterval(() => {
                  try {
                    controller.enqueue(encoder.encode(': keep-alive\n\n'))
                  } catch {}
                }, 200)
                // Interrompe o keep-alive ao fechar
                // @ts-ignore
                controller._keepAlive = id
              }
            },
            cancel() {
              // @ts-ignore
              if (this._keepAlive) clearInterval(this._keepAlive)
            },
          })
          return Promise.resolve(
            new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
          )
        }
        if (url.includes('/api/feedback')) {
          return Promise.resolve(
            new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
          )
        }
        return origFetch(input as any, init)
      }
    },
    { mode },
  )
}

test.describe('Streaming e fluxo ponta a ponta', () => {
  test('streaming visível e sugestões ao final + exportação .txt', async ({ page }) => {
    await mockSSE(page, 'finish')
    await page.goto('/')

    await page.getByRole('textbox', { name: 'Mensagem' }).fill('oi')
    await page.getByRole('button', { name: 'Enviar' }).click()

    // resultado final e sugestões
    await expect(page.getByText('Olá mundo')).toBeVisible()
    await expect(page.getByRole('button', { name: /Sugestão: Próximo A/i })).toBeVisible()

    // exportação gera um download de .txt
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Exportar/i }).click(),
    ])
    const suggested = await download.suggestedFilename()
    expect(suggested).toMatch(/\.txt$/)
  })

  test('botão Parar cancela streaming', async ({ page }) => {
    await mockSSE(page, 'infinite')
    await page.goto('/')

    await page.getByRole('textbox', { name: 'Mensagem' }).fill('oi')
    await page.getByRole('button', { name: 'Enviar' }).click()

    const stop = page.getByRole('button', { name: 'Parar' })
    await expect(stop).toBeVisible()
    await stop.click()

    // Toast de cancelamento aparece
    await expect(page.getByText(/Cancelado/i)).toBeVisible()
  })
})
