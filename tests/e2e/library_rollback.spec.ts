import { expect, test } from '@playwright/test'
import { listenLaterSeed, resultOptions, searchResultsRoute, SPOTIFY_URL } from './fixtures.js'

const rollbackURL = process.env.PLAYWRIGHT_ROLLBACK_URL
const library = '/library/listen-later'
const legacy = { id: '10000000-0000-4000-8000-000000000001', title: 'Legacy recording' }
const forward = { id: '10000000-0000-4000-8000-000000000002', title: 'Forward recording' }
const rollback = { id: '10000000-0000-4000-8000-000000000003', title: 'Rollback search recording' }
const pasted = { id: '10000000-0000-4000-8000-000000000004', title: 'Rollback pasted recording' }
const unmatched = { id: 'link-100', title: 'Unmatched rollback recording' }
const unmatchedURL = 'https://open.spotify.com/track/0DiWol3AO6WpXZgp0goxAV'
const catalogURL = 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b'
const spotifyLink = { platform: 'spotify', label: 'Spotify', url: SPOTIFY_URL, category: 'stream' }
const linked = { externalLinks: [spotifyLink] }
const forwardLinked = {
  externalLinks: [
    { ...spotifyLink, source: 'source-url' },
    { ...spotifyLink, url: catalogURL, source: 'musicbrainz' },
  ],
}

test.use({ serviceWorkers: 'block' })

test('v4 survives rollback and redeploy', { tag: '@library-rollback' }, async ({ page }) => {
  const forwardURL = process.env.PLAYWRIGHT_BASE_URL
  if (!forwardURL || !rollbackURL) {
    test.skip(true, 'Set PLAYWRIGHT_BASE_URL and PLAYWRIGHT_ROLLBACK_URL to the two built servers.')
    return
  }
  const origin = 'http://musicbox.test'
  const snapshot = () =>
    page.evaluate(async () => {
      const opening = indexedDB.open('listenLaterDB')
      const opened = Promise.withResolvers<IDBDatabase>()
      opening.onsuccess = () => opened.resolve(opening.result)
      opening.onerror = () => opened.reject(opening.error)
      const db = await opened.promise
      try {
        const reading = db.transaction('listenLaterList').objectStore('listenLaterList').getAll()
        const loaded =
          Promise.withResolvers<Array<{ id: string; title: string; musicBrainzId?: string }>>()
        reading.onsuccess = () => loaded.resolve(reading.result)
        reading.onerror = () => loaded.reject(reading.error)
        return { version: db.version, rows: await loaded.promise }
      } finally {
        db.close()
      }
    })
  const row = (title: string) => page.getByRole('row').filter({ hasText: title })
  const forwardItem = row(forward.title)
  const expectForwardLinks = async () => {
    const links = forwardItem.getByRole('link', { name: /^Spotify(?: \(source\))?$/ })
    await expect(links).toHaveCount(2)
    for (const url of [SPOTIFY_URL, catalogURL]) {
      await expect(links.and(page.locator(`[href="${url}"]`))).toBeVisible()
    }
  }
  const search = page.getByLabel('Song or album title', { exact: true })
  const result = (title: string) => resultOptions(page).filter({ hasText: title })
  const dialog = page.getByRole('dialog')
  const addLink = async (url = SPOTIFY_URL) => {
    await page.getByPlaceholder('Paste a link from Spotify').fill(url)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
  }

  // Switch application servers behind the same browser origin. IndexedDB is
  // never mocked or copied. Only catalog HTTP responses are controlled.
  let rolledBack = false
  await page.route(
    (url) => url.origin === origin,
    async (route) => {
      const server = rolledBack ? rollbackURL : forwardURL
      const { pathname, search: query } = new URL(route.request().url())
      const response = await route.fetch({ url: new URL(pathname + query, server).href })
      await route.fulfill({ response })
    }
  )
  await page.route('**/__rollback_fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>v3 library fixture</title>',
    })
  )
  await searchResultsRoute(
    page,
    [legacy, forward, rollback, pasted].map((item) => ({ ...item, coverArt: '/blank-album.svg' }))
  )
  await page.route('**/api/links?**', (route) => {
    const { searchParams } = new URL(route.request().url())
    return route.fulfill({ json: searchParams.get('mbid') === forward.id ? forwardLinked : linked })
  })
  await page.route('**/api/platform-metadata', (route) =>
    route.fulfill({
      json: {
        source: 'link',
        musicItem: {
          id: 'platform-draft',
          title: 'Platform draft',
          artists: ['Artist'],
          itemType: 'track',
        },
        linkMetadata: {
          title: 'Platform draft',
          artist: 'Artist',
          type: 'track',
          originalUrl: SPOTIFY_URL,
        },
      },
    })
  )
  await page.route('**/api/link/metadata', (route) => {
    const { url } = route.request().postDataJSON()
    const recording = url === unmatchedURL ? unmatched : pasted
    return route.fulfill({
      json: {
        source: recording === unmatched ? 'link' : 'musicbrainz',
        musicItem: { ...recording, artists: ['Artist'], itemType: 'track' },
        linkMetadata: { title: recording.title, artist: 'Artist', type: 'track', originalUrl: url },
      },
    })
  })

  await page.goto(`${origin}/__rollback_fixture`)
  expect(await page.evaluate(() => window.isSecureContext)).toBe(false)
  await page.evaluate(
    (seed) => {
      const { promise, resolve, reject } = Promise.withResolvers<void>()
      const opening = indexedDB.open('listenLaterDB', 3)
      opening.onupgradeneeded = () => {
        const store = opening.result.createObjectStore('listenLaterList', {
          keyPath: 'id',
          autoIncrement: true,
        })
        store.add(seed)
      }
      opening.onsuccess = () => {
        opening.result.close()
        resolve()
      }
      opening.onerror = () => reject(opening.error)
      return promise
    },
    listenLaterSeed({ ...legacy, itemType: 'track', externalLinks: [] })
  )

  await page.goto(origin + library)
  await expect(row(legacy.title)).toBeVisible()
  await addLink()
  await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
  await dialog.getByRole('button', { name: new RegExp(forward.title) }).click()
  await dialog.getByRole('button', { name: 'Apply corrections' }).click()
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  await expectForwardLinks()
  const upgraded = await snapshot()
  expect(upgraded.version).toBe(4)
  const forwardRow = upgraded.rows.find((item) => item.title === forward.title)
  expect(forwardRow).toMatchObject({ musicBrainzId: forward.id })
  expect(forwardRow?.id).not.toBe(forward.id)

  rolledBack = true
  await page.reload()
  await expect(row(legacy.title)).toBeVisible()
  await expectForwardLinks()
  await forwardItem.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('menuitem', { name: /as listened$/ }).click()
  await expect(forwardItem.getByText('Listened', { exact: true })).toBeVisible()
  await expectForwardLinks()
  await search.fill('recording')
  await expect(result(legacy.title)).toHaveAttribute('aria-selected', 'true')
  await expect(result(forward.title)).toHaveAttribute('aria-selected', 'true')
  const backfill = page.waitForRequest((request) => request.url().includes('/api/links?'))
  await result(rollback.title).click()
  const backfillRequest = await backfill
  expect(new URL(backfillRequest.url()).searchParams.get('mbid')).toBe(rollback.id)
  await expect(row(rollback.title).getByRole('link', { name: 'Spotify' })).toHaveAttribute(
    'href',
    SPOTIFY_URL
  )
  await addLink()
  await expect(dialog.getByRole('button', { name: 'Find MusicBrainz matches' })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  await expect(row(pasted.title)).toBeVisible()
  await addLink(unmatchedURL)
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  await expect(row(unmatched.title)).toBeVisible()
  await page.reload()
  await expectForwardLinks()
  await expect(forwardItem.getByText('Listened', { exact: true })).toBeVisible()
  await search.fill('recording')
  await expect(result(rollback.title)).toHaveAttribute('aria-selected', 'true')
  await expect(result(pasted.title)).toHaveAttribute('aria-selected', 'true')
  const afterRollback = await snapshot()
  expect(afterRollback.version).toBe(4)
  expect(afterRollback.rows).toHaveLength(5)
  expect(afterRollback.rows).toContainEqual({ ...forwardRow, hasBeenListened: true })
  for (const recording of [rollback, pasted]) {
    const saved = afterRollback.rows.find((item) => item.title === recording.title)
    expect(saved).toMatchObject({
      musicBrainzId: recording.id,
      externalLinks: linked.externalLinks,
    })
    expect(saved?.id).not.toBe(recording.id)
  }
  const unmatchedRow = afterRollback.rows.find((item) => item.title === unmatched.title)
  expect(unmatchedRow).toMatchObject({ sourceUrl: unmatchedURL, externalLinks: [] })
  expect(unmatchedRow?.musicBrainzId).toBeUndefined()
  expect(unmatchedRow?.id).not.toBe(unmatched.id)

  rolledBack = false
  await page.reload()
  for (const recording of [legacy, forward, rollback, pasted, unmatched]) {
    await expect(row(recording.title)).toBeVisible()
  }
  await expectForwardLinks()
  await search.fill('recording')
  await expect(result(rollback.title)).toHaveAttribute('aria-selected', 'true')
  await expect(result(pasted.title)).toHaveAttribute('aria-selected', 'true')
  expect(await snapshot()).toEqual(afterRollback)
})
