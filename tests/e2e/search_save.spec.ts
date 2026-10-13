import { expect, test } from '@playwright/test'
import { DB_CONFIG } from '../../src/infrastructure/storage/listen_later_storage.js'
import { resultOptions, searchResultsRoute } from './fixtures.js'

test.use({ serviceWorkers: 'block' })

test('an earlier search save cannot replace links after removing and saving the same result again', async ({
  page,
}) => {
  const recording = { id: '12345678-1234-4234-8234-123456789abc', title: 'Same Recording' }
  const oldLink = {
    platform: 'spotify',
    label: 'Spotify',
    url: 'https://open.spotify.com/track/first',
    category: 'stream',
  }
  const newLink = {
    platform: 'apple-music',
    label: 'Apple Music',
    url: 'https://music.apple.com/us/song/second/123',
    category: 'stream',
  }
  const releaseFirstLookup = Promise.withResolvers<void>()
  const linksEndpoint = '**/api/links?*'
  let lookups = 0
  await page.route(linksEndpoint, async (route) => {
    if (++lookups === 1) {
      await releaseFirstLookup.promise
      return route.fulfill({ json: { externalLinks: [oldLink] } })
    }
    return route.fulfill({
      json: { externalLinks: [newLink] },
      headers: { 'X-App-Version': 'search-save-regression-next-build' },
    })
  })
  await searchResultsRoute(page, [recording])
  await page.goto('/library/listen-later')
  await page.getByLabel('Song or album title', { exact: true }).fill(recording.title)

  const result = resultOptions(page)
  const row = page.getByRole('row').filter({ hasText: recording.title })
  const firstLookup = page.waitForRequest(linksEndpoint)
  await result.click()
  const firstRequest = await firstLookup
  expect(new URL(firstRequest.url()).searchParams.get('mbid')).toBe(recording.id)
  await expect(row.getByText('Fetching links…')).toBeVisible()
  const firstRowId = await row.evaluate((element) => element.id)

  await result.click()
  await expect(row).toHaveCount(0)
  const secondLookup = page.waitForRequest(linksEndpoint)
  await result.click()
  const secondRequest = await secondLookup
  expect(new URL(secondRequest.url()).searchParams.get('mbid')).toBe(recording.id)
  const currentLink = row.getByRole('link', { name: newLink.label })
  await expect(currentLink).toHaveAttribute('href', newLink.url)

  // The reload guard drains both lookups before asking whether to discard the
  // search text. Dismiss that dialog to check the live UI before reloading.
  await page.getByRole('button', { name: 'Reload to update', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Preparing update…', exact: true })).toBeVisible()
  releaseFirstLookup.resolve()
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click()

  await expect(row).toHaveCount(1)
  await expect(currentLink).toHaveAttribute('href', newLink.url)
  await expect(row.getByRole('link', { name: oldLink.label })).toHaveCount(0)
  const secondRowId = await row.evaluate((element) => element.id)
  expect(secondRowId).not.toBe(`item-${recording.id}`)
  expect(firstRowId).not.toBe(`item-${recording.id}`)
  expect(secondRowId).not.toBe(firstRowId)

  await page.reload()
  await expect(row).toHaveAttribute('id', secondRowId)
  await expect(currentLink).toHaveAttribute('href', newLink.url)
  await expect(row.getByRole('link', { name: oldLink.label })).toHaveCount(0)
})

test('keyboard and click saves of a remounted result persist just one row', async ({ page }) => {
  const recording = { id: '12345678-1234-4234-8234-123456789abc', title: 'Same Recording' }
  const other = { id: '12345678-1234-4234-8234-123456789def', title: 'Another Recording' }
  await searchResultsRoute(page, [recording, other])
  await page.route('**/api/links?*', (route) => route.fulfill({ json: { externalLinks: [] } }))
  await page.goto('/library/listen-later')

  const titleInput = page.getByLabel('Song or album title', { exact: true })
  const result = resultOptions(page).filter({ hasText: recording.title })
  const row = page.getByRole('row').filter({ hasText: recording.title })
  const otherRow = page.getByRole('row').filter({ hasText: other.title })
  await titleInput.fill('Recording')
  await expect(result).toBeVisible()

  // Queue app writes behind a real readwrite transaction without changing the
  // application's storage methods. Requests keep the lock alive across inputs.
  const releaseWrites = await page.evaluateHandle(async ({ name, version, storeName }) => {
    const open = indexedDB.open(name, version)
    const opened = Promise.withResolvers<IDBDatabase>()
    open.onsuccess = () => opened.resolve(open.result)
    open.onerror = () => opened.reject(open.error)
    const db = await opened.promise
    const store = db.transaction(storeName, 'readwrite').objectStore(storeName)
    let holding = true
    const keepAlive = () => {
      if (holding) store.count().onsuccess = keepAlive
    }
    keepAlive()

    return async () => {
      // Drain any queued writes before asserting page state or reloading.
      const drained = Promise.withResolvers<void>()
      const read = db.transaction(storeName)
      read.objectStore(storeName).count()
      read.oncomplete = () => drained.resolve()
      read.onabort = () => drained.reject(read.error)
      holding = false
      await drained.promise
      db.close()
    }
  }, DB_CONFIG)

  await titleInput.press('ArrowDown')
  await expect(result).toBeFocused()
  await page.keyboard.press('Enter')
  await titleInput.clear()
  await expect(result).toHaveCount(0)
  await titleInput.fill('Recording')
  await expect(result).toHaveAttribute('aria-selected', 'false')
  await result.click()
  await resultOptions(page).filter({ hasText: other.title }).click()
  await expect(row).toHaveCount(0)
  await releaseWrites.evaluate((release) => release())

  await expect(row).toHaveCount(1)
  await expect(otherRow).toHaveCount(1)
  await page.reload()
  await expect(row).toHaveCount(1)
  await expect(otherRow).toHaveCount(1)
})

test('an aborted search save can be retried and toggled off after commit', async ({ page }) => {
  const recording = { id: '12345678-1234-4234-8234-123456789abc', title: 'Retry Recording' }
  await searchResultsRoute(page, [recording])
  await page.route('**/api/links?*', (route) => route.fulfill({ json: { externalLinks: [] } }))
  await page.goto('/library/listen-later')
  await page.getByLabel('Song or album title', { exact: true }).fill(recording.title)
  const result = resultOptions(page)
  const row = page.getByRole('row').filter({ hasText: recording.title })
  await expect(result).toBeVisible()

  await page.evaluate(() => {
    const add = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function (...args) {
      IDBObjectStore.prototype.add = add
      const request = add.apply(this, args)
      this.transaction.abort()
      return request
    }
  })

  await result.click()
  await expect(page.getByText('Could not add "Retry Recording" by Rick Astley')).toBeVisible()
  await expect(row).toHaveCount(0)
  await result.click()
  await expect(row).toHaveCount(1)
  await expect(result).toHaveAttribute('aria-selected', 'true')
  await result.click()
  await expect(row).toHaveCount(0)
  await expect(result).toHaveAttribute('aria-selected', 'false')
})
