import { test, expect } from '@playwright/test'
import { mockMetadataResponse, mockMetadataRoute } from './fixtures.js'

const sourceUrl = 'https://youtu.be/Fvr33bVSglE?si=sTH8gVBiwjJ0MOAe'

for (const applyMatch of [false, true]) {
  test(`saved short YouTube source survives failed lookup ${applyMatch ? 'with Apply' : 'without matching'}`, async ({
    page,
  }) => {
    await mockMetadataRoute(page, sourceUrl)
    await page.route('**/api/links?**', (route) => route.fulfill({ status: 503, json: {} }))
    const title = applyMatch ? 'Corrected title' : mockMetadataResponse.musicItem.title
    if (applyMatch) {
      await page.route('**/library/listen-later?**', (route) =>
        route.fulfill({
          json: {
            serializedItems: [
              {
                ...mockMetadataResponse.musicItem,
                id: '12345678-1234-4234-8234-123456789abc',
                title,
              },
            ],
          },
        })
      )
    }
    await page.goto('/library/listen-later')
    await page.getByPlaceholder('Paste a link from Spotify').fill(sourceUrl)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const dialog = page.getByRole('dialog')
    if (applyMatch) {
      await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
      await dialog.getByRole('button', { name: title }).click()
      await dialog.getByRole('button', { name: 'Apply corrections' }).click()
    }
    const lookup = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/links')
    await dialog.getByRole('button', { name: 'Add to List' }).click()
    const response = await lookup
    expect(response.status()).toBe(503)
    expect(new URL(response.url()).searchParams.get('sourceUrl')).toBe(sourceUrl)
    const source = page
      .getByRole('row')
      .filter({ hasText: title })
      .getByRole('link', { name: 'YouTube Music (source)' })
    await expect(source).toBeVisible()
    await expect(source).toHaveAttribute('href', sourceUrl)
    await page.reload()
    await expect(source).toBeVisible()
    await expect(source).toHaveAttribute('href', sourceUrl)
  })
}
