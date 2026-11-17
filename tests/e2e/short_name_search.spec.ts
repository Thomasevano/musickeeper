import { test, expect } from '@playwright/test'
import { mockMetadataResponse, SPOTIFY_URL } from './fixtures.js'

const candidate = {
  ...mockMetadataResponse.musicItem,
  id: '12345678-1234-4234-8234-123456789abc',
  title: 'Go',
  artists: ['U2'],
  coverArt: '/blank-album.svg',
}

test.beforeEach(async ({ page }) => {
  await page.goto('/library/listen-later')
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') })
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'))
})

for (const { field, value, parameter } of [
  { field: 'Song or album title', value: 'Go', parameter: 'q' },
  { field: 'Artist name', value: 'U2', parameter: 'artist' },
]) {
  test(`live search accepts ${value} after the debounce, but not one character`, async ({
    page,
  }) => {
    const queries: URLSearchParams[] = []
    await page.route('**/library/listen-later?**', (route) => {
      queries.push(new URL(route.request().url()).searchParams)
      return route.fulfill({ json: { serializedItems: [candidate] } })
    })
    const input = page.getByLabel(field, { exact: true })
    await input.fill(value.slice(0, 1))
    await page.clock.runFor(500)
    expect(queries).toHaveLength(0)

    await input.fill(value)
    await page.clock.runFor(299)
    expect(queries).toHaveLength(0)
    await page.clock.runFor(1)
    await expect(page.getByRole('listbox').getByRole('option')).toContainText('Go')
    expect(queries).toHaveLength(1)
    expect(queries[0].get(parameter)).toBe(value)
  })
}

test('typing resets the debounce instead of searching every intermediate value', async ({
  page,
}) => {
  const titles: string[] = []
  await page.route('**/library/listen-later?**', (route) => {
    titles.push(new URL(route.request().url()).searchParams.get('q') ?? '')
    return route.fulfill({ json: { serializedItems: [candidate] } })
  })
  const input = page.getByLabel('Song or album title', { exact: true })
  await input.fill('Go')
  await page.clock.runFor(200)
  await input.fill('Gor')
  await page.clock.runFor(299)
  expect(titles).toEqual([])
  await page.clock.runFor(1)
  await expect(page.getByRole('listbox').getByRole('option')).toBeVisible()
  expect(titles).toEqual(['Gor'])
})

test('a short artist filter is preserved when the title meets the live-search minimum', async ({
  page,
}) => {
  const queries: URLSearchParams[] = []
  await page.route('**/library/listen-later?**', (route) => {
    queries.push(new URL(route.request().url()).searchParams)
    return route.fulfill({ json: { serializedItems: [candidate] } })
  })
  await page.getByLabel('Artist name', { exact: true }).fill('X')
  await page.clock.runFor(300)
  expect(queries).toHaveLength(0)
  await page.getByLabel('Song or album title', { exact: true }).fill('Go')
  await page.clock.runFor(300)
  await expect(page.getByRole('listbox').getByRole('option')).toBeVisible()
  expect(queries[0].get('q')).toBe('Go')
  expect(queries[0].get('artist')).toBe('X')
})

test('dropping below the minimum cancels a pending search and leaves no stale results', async ({
  page,
}) => {
  const { promise: held, resolve: release } = Promise.withResolvers<void>()
  const { promise: requested, resolve: started } = Promise.withResolvers<void>()
  const { promise: handled, resolve: completed } = Promise.withResolvers<void>()
  await page.route('**/library/listen-later?**', async (route) => {
    started()
    await held
    await route.fulfill({ json: { serializedItems: [candidate] } })
    completed()
  })
  const input = page.getByLabel('Song or album title', { exact: true })
  await input.fill('Go')
  await page.clock.runFor(300)
  await requested
  const cancelled = page.waitForEvent('requestfailed', {
    predicate: (request) => new URL(request.url()).searchParams.get('q') === 'Go',
  })
  await input.fill('G')
  await page.clock.runFor(300)
  await cancelled
  release()
  await handled
  await expect(page.getByRole('listbox')).not.toBeVisible()
})

for (const { title, artist } of [
  { title: 'Go', artist: 'U2' },
  { title: 'X', artist: 'M' },
]) {
  test(`explicit matching sends ${title} / ${artist} through the shared search endpoint`, async ({
    page,
  }) => {
    const queries: URLSearchParams[] = []
    await page.route('**/api/platform-metadata', (route) =>
      route.fulfill({
        json: {
          ...mockMetadataResponse,
          musicItem: { ...mockMetadataResponse.musicItem, coverArt: '/blank-album.svg' },
        },
      })
    )
    await page.route('**/library/listen-later?**', (route) => {
      queries.push(new URL(route.request().url()).searchParams)
      return route.fulfill({ json: { serializedItems: [candidate] } })
    })
    await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Title', { exact: true }).fill(title)
    await dialog.getByLabel('Artists', { exact: true }).fill(artist)
    expect(queries).toHaveLength(0)
    await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
    await expect(dialog.getByRole('button', { name: /Go/ })).toBeVisible()
    expect(queries[0].get('q')).toBe(title)
    expect(queries[0].get('artist')).toBe(artist)
  })
}
