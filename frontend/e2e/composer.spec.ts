import { test, expect } from '@playwright/test'

test.describe('Composer', () => {
  test('botão Enviar habilita/desabilita conforme input', async ({ page }) => {
    await page.goto('/')
    const send = page.getByRole('button', { name: 'Enviar' })
    await expect(send).toBeDisabled()
    await page.getByRole('textbox', { name: 'Mensagem' }).fill('oi')
    await expect(send).toBeEnabled()
  })

  test('confirmação de Limpar', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Limpar conversa' }).click()
    const dialog = page.getByRole('dialog', { name: /Limpar conversa/i })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancelar' }).click()
    await expect(dialog).toHaveCount(0)
  })
})
