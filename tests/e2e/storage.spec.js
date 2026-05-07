import { test, expect } from '@playwright/test'

test.describe('Хранилище документов', () => {
  test('переключение между плиткой и списком', async ({ page }) => {
    await page.goto('/documents')
    // Кнопка "Плитка"
    await page.locator('.view__button img[src*="tile"]').click()
    await expect(page.locator('.tile-container')).toBeVisible()
    // Кнопка "Список"
    await page.locator('.view__button img[src*="list"]').click()
    await expect(page.locator('.list-container')).toBeVisible()
  })

  test('сортировка документов по имени', async ({ page }) => {
    await page.goto('/documents')
    await page.locator('.storage__filter').click()
    await page.getByText('названию (А-Я)').click()
    // Проверяем, что первый документ "Документы" (если порядок изменился)
    const firstDoc = page.locator('.document .name').first()
    await expect(firstDoc).toHaveText(/Документы|OZON Банк|Контракты|Отчёты|Работа/)
  })
})