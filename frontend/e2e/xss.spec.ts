import { test, expect, type Page } from '@playwright/test'

async function mockSSE(page: Page, payload: string) {
  await page.addInitScript(
    ({ payload }) => {
      ;(window as any).__xssFlag = 0
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
              controller.enqueue(
                encoder.encode(`data: {"chunk":"${payload.replace(/"/g, '\\"')}"}\n\n`),
              )
              setTimeout(() => controller.close(), 50)
            },
          })
          return Promise.resolve(
            new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
          )
        }
        return origFetch(input as any, init)
      }
    },
    { payload },
  )
}

const PAYLOADS = [
  '<img src=x onerror="window.__xssFlag=1">',
  '<svg onload="window.__xssFlag=1"></svg>',
  '<a href="javascript:window.__xssFlag=1">x</a>',
]

test.describe('Anti-XSS E2E', () => {
  for (const p of PAYLOADS) {
    test(`não executa nem interpreta HTML malicioso: ${p.slice(0, 20)}…`, async ({ page }) => {
      await mockSSE(page, p)
      await page.goto('/')

      await page.getByRole('textbox', { name: 'Mensagem' }).fill('teste')
      await page.getByRole('button', { name: 'Enviar' }).click()

      const lastBubble = page.locator('[data-testid="chat-message"]').last()
      const lastContent = lastBubble.locator('[data-testid="chat-content"]').last()

      // Conteúdo literal visível dentro da última mensagem
      await expect(lastContent.getByText(p, { exact: false })).toBeVisible()

      // Nenhum elemento perigoso deve ser criado dentro da mensagem
      await expect(lastBubble.locator('img')).toHaveCount(0)
      await expect(lastBubble.locator('svg')).toHaveCount(0)
      await expect(lastBubble.locator('a[href^="javascript:"]')).toHaveCount(0)

      // Flag global não alterada
      const flag = await page.evaluate(() => (window as any).__xssFlag)
      expect(flag).toBe(0)
    })
  }
})
