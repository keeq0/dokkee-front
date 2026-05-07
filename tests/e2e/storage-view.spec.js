import { test, expect } from '@playwright/test'

test.describe('Переключение вида документов', () => {
  test('плитка и список работают', async ({ page }) => {
    await page.goto('/documents')
    // Плитка
    await page.locator('.view__button img[src*="tile"]').click()
    await expect(page.locator('.tile-container')).toBeVisible()
    // Список
    await page.locator('.view__button img[src*="list"]').click()
    await expect(page.locator('.list-container')).toBeVisible()
  })
})