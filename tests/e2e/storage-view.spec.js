import { test, expect } from '@playwright/test'

test.describe('Переключение вида документов', () => {
  test('плитка и список работают', async ({ page }) => {
    await page.goto('/documents')
    // Ждём появления кнопок переключения вида
    const tileButton = page.locator('.view__button img[src*="tile"]').first()
    const listButton = page.locator('.view__button img[src*="list"]').first()
    await expect(tileButton).toBeVisible()
    // Плитка
    await tileButton.click()
    await expect(page.locator('.tile-container')).toBeVisible()
    // Список
    await listButton.click()
    await expect(page.locator('.list-container')).toBeVisible()
  })
})