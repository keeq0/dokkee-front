import { test, expect } from '@playwright/test'

test.describe('Загрузка документов', () => {
  test('пользователь может загрузить файл через DropMenu', async ({ page }) => {
    await page.goto('/')
    const fileInput = page.locator('.drop-menu__zone input[type="file"]')
    await fileInput.setInputFiles('./tests/e2e/fixtures/sample.pdf')
    await expect(page.locator('.upload-documents__file-name')).toContainText('sample.pdf')
  })

  test('нажатие "Запустить проверку" открывает ИИ-помощника и отображает мок-ответ', async ({ page }) => {
    // Перехватываем запрос к Deepseek до загрузки страницы
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
    // Ждём, когда появится ассистент
    await expect(page.locator('.assistant')).toBeVisible({ timeout: 15000 })
    // Ждём, когда в сообщении появится текст из мока. Используем более гибкий поиск.
    const messageLocator = page.locator('.assistant__second-message .message__content') // или .message__content, но точнее
    await expect(messageLocator).toContainText('Моковый анализ', { timeout: 30000 })
  })
})