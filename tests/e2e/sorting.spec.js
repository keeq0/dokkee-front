import { test, expect } from '@playwright/test'

test.describe('Сортировка документов', () => {
  test('сортировка по названию', async ({ page }) => {
    await page.goto('/documents')
    await page.locator('.storage__filter').click()
    await page.getByText('названию (А-Я)').click()
    // Проверяем, что сортировка применилась (заголовок фильтра изменился)
    await expect(page.locator('.filter__value')).toHaveText('названию (А-Я)')
  })
})