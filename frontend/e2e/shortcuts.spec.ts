import { test, expect } from '@playwright/test'

test.describe('Atalhos de teclado', () => {
  test('abre modal com ? e fecha pelo botão', async ({ page }) => {
    await page.goto('/')
    await page.locator('body').click()
    // Dispara o atalho via evento no window para evitar variações de layout de teclado
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true }))
    })
    const heading = page.getByRole('heading', { name: 'Atalhos de teclado' })
    await expect(heading).toBeVisible()
    await page.getByRole('button', { name: 'Fechar' }).click()
    await expect(heading).toHaveCount(0)
  })

  test('foca textarea com /', async ({ page }) => {
    await page.goto('/')
    await page.locator('body').click()
    await page.keyboard.press('/')
    const textarea = page.getByRole('textbox', { name: 'Mensagem' })
    await expect(textarea).toBeFocused()
  })
})
