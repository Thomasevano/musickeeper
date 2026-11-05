import { test, expect } from '@playwright/test'
import { mockMetadataRoute } from './fixtures.js'

const sourceUrl = 'https://youtu.be/Fvr33bVSglE?si=sTH8gVBiwjJ0MOAe'

test('a pasted short YouTube source stays clickable after save and reload', async ({ page }) => {
  await mockMetadataRoute(page, sourceUrl)
  await page.route('**/api/links?**', (route) =>
    route.fulfill({
      json: {
        externalLinks: [
          {
            platform: 'youtube-music',
            label: 'YouTube Music',
            url: sourceUrl,
            category: 'stream',
            source: 'source-url',
          },
        ],
      },
    })
  )
  await page.goto('/library/listen-later')
  await page.getByPlaceholder('Paste a link from Spotify').fill(sourceUrl)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const linksRequest = page.waitForRequest(
    (request) => new URL(request.url()).pathname === '/api/links'
  )
  await page.getByRole('button', { name: 'Add to List' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const request = await linksRequest
  expect(new URL(request.url()).searchParams.get('sourceUrl')).toBe(sourceUrl)

  const source = page.getByRole('row').getByRole('link', { name: /YouTube/ })
  await expect(source).toBeVisible()
  await expect(source).toHaveAttribute('href', sourceUrl)
  await page.reload()
  await expect(source).toBeVisible()
  await expect(source).toHaveAttribute('href', sourceUrl)
})
