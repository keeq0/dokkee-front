import { test, expect } from '@playwright/test'

test.describe('Хранилище документов', () => {
  test('переключение между плиткой и списком', async ({ page }) => {
    await page.goto('/documents')
    const tileButton = page.locator('.view__button img[src*="tile"]').first()
    const listButton = page.locator('.view__button img[src*="list"]').first()
    await expect(tileButton).toBeVisible()
    await tileButton.click()
    await expect(page.locator('.tile-container')).toBeVisible()
    await listButton.click()
    await expect(page.locator('.list-container')).toBeVisible()
  })

  test('сортировка документов по имени', async ({ page }) => {
    await page.goto('/documents')
    const filter = page.locator('.storage__filter').first()
    await filter.click()
    await page.locator('.filter-options').getByText('названию (А-Я)', { exact: true }).click()
    await expect(filter.locator('.filter__value')).toHaveText('названию (А-Я)')
  })
})