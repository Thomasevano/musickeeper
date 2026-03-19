import { test, expect } from '@playwright/test'

test.describe('listen later page', () => {
  test('loads the page', async ({ page }) => {
    await page.goto('/library/listen-later')
    await expect(page).toHaveTitle(/Listen Later/)
  })
})
