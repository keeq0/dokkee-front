import { test, expect } from '@playwright/test'

test.describe('Загрузка документов', () => {
  test('пользователь может загрузить файл через DropMenu', async ({ page }) => {
    await page.goto('/')
    const fileInput = page.locator('.drop-menu__zone input[type="file"]')
    await fileInput.setInputFiles('./tests/e2e/fixtures/sample.pdf')
    await expect(page.locator('.upload-documents__file-name')).toContainText('sample.pdf')
  })

  test('нажатие "Запустить проверку" открывает ИИ-помощника (с моком API)', async ({ page }) => {
    // Перехватываем запрос к Deepseek и возвращаем мок-ответ
    await page.route('https://api.deepseek.com/chat/completions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [{ message: { content: 'Моковый анализ. Ваш документ в полном порядке.' } }]
        })
      })
    })

    await page.goto('/')
    const fileInput = page.locator('.drop-menu__zone input[type="file"]')
    await fileInput.setInputFiles('./tests/e2e/fixtures/sample.pdf')
    await page.locator('.agreement__checkbox').check()
    await page.locator('.upload__start').click()
    await expect(page.locator('.assistant')).toBeVisible({ timeout: 10000 })
    // Проверяем, что текст из мока появился (опционально)
    await expect(page.locator('.message__content')).toContainText('Моковый анализ')
  })
})