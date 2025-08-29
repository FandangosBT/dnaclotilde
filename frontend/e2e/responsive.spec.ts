import { test, expect } from '@playwright/test'

const breakpoints = [
  { name: 'sm', width: 360, height: 740 },
  { name: 'md', width: 768, height: 1024 },
  { name: 'lg', width: 1280, height: 800 },
]

test.describe('Responsividade', () => {
  for (const bp of breakpoints) {
    test(`layout em ${bp.name} sem overflow e UI essencial visível`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height })
      await page.goto('/')

      // Sem overflow horizontal
      const noOverflow = await page.evaluate(() => {
        const doc = document.documentElement
        return doc.scrollWidth <= doc.clientWidth && document.body.scrollWidth <= window.innerWidth
      })
      expect(noOverflow).toBeTruthy()

      // Composer visível e botão Enviar dentro do viewport
      const input = page.getByRole('textbox', { name: 'Mensagem' })
      await expect(input).toBeVisible()
      const send = page.getByRole('button', { name: 'Enviar' })
      await expect(send).toBeVisible()

      const box = await send.boundingBox()
      expect(box).not.toBeNull()
      const within = await page.evaluate(({ x, y, width, height }) => {
        return (
          x >= 0 && y >= 0 && x + width <= window.innerWidth && y + height <= window.innerHeight
        )
      }, box!)
      expect(within).toBeTruthy()

      // Header visível
      await expect(page.getByRole('banner')).toBeVisible()
    })
  }
})
