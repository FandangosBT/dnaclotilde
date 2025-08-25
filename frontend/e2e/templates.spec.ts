import { test, expect } from '@playwright/test'

test.describe('Templates Drawer', () => {
  test('abre e insere template no textarea', async ({ page }) => {
    await page.route('**/templates?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ templates: { Gerais: ['Boas-vindas', 'Despedida'] } }),
      })
    })

    await page.goto('/')

    await page.getByRole('button', { name: 'Abrir templates' }).click()

    const closeBtn = page.getByRole('button', { name: 'Fechar templates' })
    await expect(closeBtn).toBeVisible()

    const first = page.getByRole('button', { name: 'Template: Boas-vindas' })
    await expect(first).toBeVisible()
    await first.focus()
    await page.keyboard.press('Enter')

    const textarea = page.getByRole('textbox', { name: 'Mensagem' })
    await expect(textarea).toHaveValue(/Boas-vindas/)

    await expect(closeBtn).toHaveCount(0)
  })
})
