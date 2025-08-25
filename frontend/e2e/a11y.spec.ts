import { test, expect } from '@playwright/test'

test.describe('Acessibilidade e teclado', () => {
  test('Escape fecha Templates Drawer', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Abrir templates' }).click()
    const closeBtn = page.getByRole('button', { name: 'Fechar templates' })
    await expect(closeBtn).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(closeBtn).toHaveCount(0)
  })

  test('Escape fecha diálogo de Limpar conversa', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Limpar conversa' }).click()
    const dialog = page.getByRole('dialog', { name: /Limpar conversa/i })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  })

  test('Tab navega do textarea para Enviar', async ({ page }) => {
    await page.goto('/')
    const textarea = page.getByRole('textbox', { name: 'Mensagem' })
    await textarea.focus()
    const send = page.getByRole('button', { name: 'Enviar' })

    let focused = false
    for (let i = 0; i < 8 && !focused; i++) {
      await page.keyboard.press('Tab')
      focused = await send.evaluate((el) => document.activeElement === el)
    }
    expect(focused).toBeTruthy()
  })

  test('Landmarks e aria-live presentes', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('main')).toBeVisible()
    const live = page.locator('[aria-live]')
    await expect(live.first()).toBeVisible()
  })
})