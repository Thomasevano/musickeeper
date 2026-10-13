import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { SPOTIFY_URL, seedListenLaterItems, listenLaterSeed } from './fixtures.js'

const platformItem = {
  id: 'platform-draft',
  title: 'Platform title',
  artists: ['Platform artist'],
  albumName: 'Platform album',
  coverArt: '/blank-album.svg',
  itemType: 'track',
  releaseDate: '',
}
const candidates = [
  {
    ...platformItem,
    id: '12345678-1234-4234-8234-123456789abc',
    title: 'Corrected title',
    artists: ['Corrected artist'],
    releaseDate: '2001-02-03',
    length: 240000,
    albumName: 'Different album',
    coverArt: '/candidate.svg',
  },
  { ...platformItem, id: '22345678-1234-4234-8234-123456789abc', title: 'Other recording' },
]
async function paste(page: Page) {
  await page.route('**/api/platform-metadata', (route) =>
    route.fulfill({
      json: {
        musicItem: platformItem,
        source: 'link',
        linkMetadata: {
          title: platformItem.title,
          artist: platformItem.artists[0],
          type: 'track',
          originalUrl: SPOTIFY_URL,
          albumName: platformItem.albumName,
          thumbnailUrl: platformItem.coverArt,
        },
      },
    })
  )
  await page.route('**/api/links?**', (route) => route.fulfill({ json: { externalLinks: [] } }))
  await page.goto('/library/listen-later')
  await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('Title', { exact: true })).toHaveValue(
    'Platform title'
  )
}

test('candidate selection previews corrections; only Apply changes the draft; association survives reload', async ({
  page,
}) => {
  await page.route('**/library/listen-later?**', (route) =>
    route.fulfill({ json: { serializedItems: candidates } })
  )
  await paste(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
  await expect(dialog.getByRole('button', { name: /Other recording/ })).toBeVisible()
  await dialog.getByRole('button', { name: /Corrected title/ }).click()
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Platform title')
  await expect(dialog.getByRole('table', { name: 'Proposed corrections' })).toContainText(
    'Corrected title'
  )
  await dialog.getByRole('button', { name: 'Apply corrections' }).click()
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Corrected title')
  await expect(dialog.getByLabel('Album', { exact: true })).toHaveValue('Platform album')
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  await expect(dialog).not.toBeVisible()
  await page.reload()
  await expect(page.getByRole('row').filter({ hasText: 'Corrected title' })).toContainText(
    'Corrected artist'
  )
  const saved = await savedItems(page)
  expect(saved[0]).toMatchObject({
    musicBrainzId: candidates[0].id,
    sourceUrl: SPOTIFY_URL,
    itemType: 'track',
    albumName: 'Platform album',
    coverArt: '/blank-album.svg',
    releaseDate: '2001-02-03',
  })
  expect(saved[0].id).not.toBe(candidates[0].id)
})

async function savedItems(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('listenLaterDB')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const items = await new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      const request = db.transaction('listenLaterList').objectStore('listenLaterList').getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return items
  })
}

for (const field of ['Title', 'Artists', 'Item Type:']) {
  test('pre-save identifying edit detaches applied association: ' + field, async ({ page }) => {
    await page.route('**/library/listen-later?**', (route) =>
      route.fulfill({ json: { serializedItems: candidates } })
    )
    await paste(page)
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
    await dialog.getByRole('button', { name: /Corrected title/ }).click()
    await dialog.getByRole('button', { name: 'Apply corrections' }).click()
    if (field === 'Item Type:')
      await dialog.getByLabel(field, { exact: true }).selectOption('album')
    else await dialog.getByLabel(field, { exact: true }).fill('My edited value')
    const linksRequest = page.waitForRequest((request) => request.url().includes('/api/links?'))
    await dialog.getByRole('button', { name: 'Add to List' }).click()
    const request = await linksRequest
    const query = new URL(request.url()).searchParams
    expect(query.has('mbid')).toBe(false)
    expect(
      query.get(field === 'Artists' ? 'artists' : field === 'Item Type:' ? 'type' : 'title')
    ).toBe(field === 'Item Type:' ? 'album' : 'My edited value')
    await page.reload()
    const saved = await savedItems(page)
    expect(saved[0].musicBrainzId).toBeUndefined()
  })
}

test('save abandons pending matching; late results cannot change saved metadata or a new draft', async ({
  page,
}) => {
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  let requested!: () => void
  const started = new Promise<void>((resolve) => {
    requested = resolve
  })
  await page.route('**/library/listen-later?**', async (route) => {
    requested()
    await pending
    await route.fulfill({ json: { serializedItems: candidates } })
  })
  await paste(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
  await started
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  await expect(dialog).not.toBeVisible()
  const saved = await savedItems(page)
  expect(saved[0]).toMatchObject({ title: platformItem.title })
  expect(saved[0].musicBrainzId).toBeUndefined()
  await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(platformItem.title)
  release()
  await expect(dialog.getByRole('table', { name: 'Proposed corrections' })).not.toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.reload()
  const reloaded = await savedItems(page)
  expect(reloaded[0]).toMatchObject({ title: platformItem.title })
})

for (const result of ['empty', 'failure', 'cancel']) {
  test('matching ' + result + ' preserves an already applied association', async ({ page }) => {
    let searches = 0
    await page.route('**/library/listen-later?**', (route) => {
      searches++
      return route.fulfill(
        searches === 1
          ? { json: { serializedItems: candidates } }
          : result === 'failure'
            ? { status: 502, json: { error: 'Unavailable' } }
            : { json: { serializedItems: [] } }
      )
    })
    await paste(page)
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
    await dialog.getByRole('button', { name: /Corrected title/ }).click()
    await dialog.getByRole('button', { name: 'Apply corrections' }).click()
    if (result === 'cancel') {
      await page.route('**/library/listen-later?**', (route) =>
        route.fulfill({ json: { serializedItems: candidates } })
      )
    }
    await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
    if (result === 'cancel') {
      await dialog.getByRole('button', { name: /Other recording/ }).click()
      await dialog.getByRole('button', { name: 'Cancel matching' }).click()
    } else
      await expect(
        dialog
          .getByRole('status')
          .filter({ hasText: result === 'failure' ? 'search failed' : 'No MusicBrainz matches' })
      ).toBeVisible()
    await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Corrected title')
    await dialog.getByRole('button', { name: 'Add to List' }).click()
    await expect(dialog).not.toBeVisible()
    const saved = await savedItems(page)
    expect(saved[0].musicBrainzId).toBe(candidates[0].id)
  })
}

test('ordinary paste and incomplete metadata save never request matching; effective edits drive External Links', async ({
  page,
}) => {
  let searches = 0
  page.on('request', (request) => {
    if (request.url().includes('/library/listen-later?')) searches++
  })
  await paste(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Artists', { exact: true }).fill('')
  await dialog.getByLabel('Title', { exact: true }).fill('My platform title')
  const linksRequest = page.waitForRequest((request) => request.url().includes('/api/links?'))
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  const request = await linksRequest
  const query = new URL(request.url()).searchParams
  expect(query.has('mbid')).toBe(false)
  expect(query.get('title')).toBe('My platform title')
  expect(query.get('artists')).toBe('')
  expect(query.get('sourceUrl')).toBe(SPOTIFY_URL)
  await page.reload()
  await expect(page.getByRole('row').filter({ hasText: 'My platform title' })).toBeVisible()
  expect(searches).toBe(0)
})

test('selected but unapplied candidate is not saved', async ({ page }) => {
  await page.route('**/library/listen-later?**', (route) =>
    route.fulfill({ json: { serializedItems: candidates } })
  )
  await paste(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
  await dialog.getByRole('button', { name: /Other recording/ }).click()
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  await expect(dialog).not.toBeVisible()
  const saved = await savedItems(page)
  expect(saved[0]).toMatchObject({ title: platformItem.title })
  expect(saved[0].musicBrainzId).toBeUndefined()
})

test('saving during another search preserves a valid applied match', async ({ page }) => {
  await page.route('**/library/listen-later?**', (route) =>
    route.fulfill({ json: { serializedItems: candidates } })
  )
  await paste(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
  await dialog.getByRole('button', { name: /Corrected title/ }).click()
  await dialog.getByRole('button', { name: 'Apply corrections' }).click()
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/library/listen-later?**', async (route) => {
    await held
    await route.fulfill({ json: { serializedItems: candidates } })
  })
  await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
  await expect(
    dialog.getByRole('status').filter({ hasText: 'Searching MusicBrainz' })
  ).toBeVisible()
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  await expect(dialog).not.toBeVisible()
  release()
  await page.reload()
  const saved = await savedItems(page)
  expect(saved[0]).toMatchObject({
    title: candidates[0].title,
    musicBrainzId: candidates[0].id,
  })
})

test('keyboard matching cancellation and Apply return focus; closing returns to Add', async ({
  page,
}) => {
  await page.route('**/library/listen-later?**', (route) =>
    route.fulfill({ json: { serializedItems: candidates } })
  )
  await paste(page)
  const dialog = page.getByRole('dialog')
  const find = dialog.getByRole('button', { name: 'Find MusicBrainz matches' })
  await find.focus()
  await page.keyboard.press('Enter')
  const candidate = dialog.getByRole('button', { name: /Corrected title/ })
  await candidate.focus()
  await page.keyboard.press('Enter')
  await dialog.getByRole('button', { name: 'Cancel matching' }).focus()
  await page.keyboard.press('Enter')
  await expect(find).toBeFocused()
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(platformItem.title)
  await page.keyboard.press('Enter')
  await candidate.focus()
  await page.keyboard.press('Enter')
  await dialog.getByRole('button', { name: 'Apply corrections' }).focus()
  await page.keyboard.press('Enter')
  await expect(find).toBeFocused()
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(candidates[0].title)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeFocused()
})

test('current edits drive search; Apply rechecks Duplicate against reviewed metadata', async ({
  page,
}) => {
  await paste(page)
  await seedListenLaterItems(page, [
    listenLaterSeed({
      id: 'existing',
      title: candidates[0].title,
      artists: candidates[0].artists,
      itemType: 'track',
    }),
  ])
  await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title', { exact: true }).fill('Edited search title')
  await dialog.getByLabel('Artists', { exact: true }).fill('Edited search artist')
  const requested = page.waitForRequest((request) =>
    request.url().includes('/library/listen-later?')
  )
  await page.route('**/library/listen-later?**', (route) =>
    route.fulfill({ json: { serializedItems: candidates } })
  )
  await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
  const request = await requested
  const query = new URL(request.url()).searchParams
  expect(query.get('q')).toBe('Edited search title')
  expect(query.get('artist')).toBe('Edited search artist')
  expect(query.get('type')).toBe('track')
  await dialog.getByRole('button', { name: /Corrected title/ }).click()
  await expect(dialog.getByRole('button', { name: 'Add to List' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Apply corrections' }).click()
  await expect(dialog.getByRole('button', { name: 'Add Anyway' })).toBeVisible()
  await dialog.getByLabel('Title', { exact: true }).fill('Different version')
  await expect(dialog.getByRole('button', { name: 'Add to List' })).toBeVisible()
})

test('keyboard cancelling a pending search returns focus to enabled matching action', async ({
  page,
}) => {
  await paste(page)
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/library/listen-later?**', async (route) => {
    await held
    await route.fulfill({ json: { serializedItems: candidates } })
  })
  const dialog = page.getByRole('dialog')
  const find = dialog.getByRole('button', { name: 'Find MusicBrainz matches' })
  await find.click()
  await dialog.getByRole('button', { name: 'Cancel matching' }).focus()
  await page.keyboard.press('Enter')
  await expect(find).toBeFocused()
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(platformItem.title)
  release()
})

test('saved matched item keeps distinct source and catalog links on one platform', async ({
  page,
}) => {
  await page.route('**/library/listen-later?**', (route) =>
    route.fulfill({ json: { serializedItems: candidates } })
  )
  await paste(page)
  const catalogUrl = 'https://open.spotify.com/track/matched'
  await page.route('**/api/links?**', (route) =>
    route.fulfill({
      json: {
        externalLinks: [
          {
            platform: 'spotify',
            label: 'Spotify',
            category: 'stream',
            source: 'source-url',
            url: SPOTIFY_URL,
          },
          {
            platform: 'spotify',
            label: 'Spotify',
            category: 'stream',
            source: 'musicbrainz',
            url: catalogUrl,
          },
        ],
      },
    })
  )
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
  await dialog.getByRole('button', { name: /Corrected title/ }).click()
  await dialog.getByRole('button', { name: 'Apply corrections' }).click()
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Corrected title' })
  await expect(row.getByRole('link', { name: 'Spotify (source)', exact: true })).toHaveAttribute(
    'href',
    SPOTIFY_URL
  )
  await expect(row.getByRole('link', { name: 'Spotify', exact: true })).toHaveAttribute(
    'href',
    catalogUrl
  )
  await page.reload()
  await expect(row.getByRole('link', { name: 'Spotify', exact: true })).toHaveAttribute(
    'href',
    catalogUrl
  )
})

test('external lookup failure preserves the directly saved source link', async ({ page }) => {
  await paste(page)
  await page.route('**/api/links?**', (route) =>
    route.fulfill({ status: 502, json: { error: 'Provider unavailable' } })
  )
  await page.getByRole('dialog').getByRole('button', { name: 'Add to List' }).click()
  await page.reload()
  const row = page.getByRole('row').filter({ hasText: platformItem.title })
  await expect(row.getByRole('link', { name: 'Spotify (source)', exact: true })).toHaveAttribute(
    'href',
    SPOTIFY_URL
  )
})

test('closing a held platform request prevents it replacing a newer draft', async ({ page }) => {
  await paste(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let started!: () => void
  const requested = new Promise<void>((resolve) => {
    started = resolve
  })
  let calls = 0
  await page.route('**/api/platform-metadata', async (route) => {
    const call = ++calls
    if (call === 1) {
      started()
      await held
    }
    await route.fulfill({
      json: {
        musicItem: {
          ...platformItem,
          title: call === 1 ? 'Obsolete response' : 'New platform title',
        },
        source: 'link',
        linkMetadata: { originalUrl: SPOTIFY_URL },
      },
    })
  })
  await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await requested
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('Title', { exact: true })).toHaveValue(
    'New platform title'
  )
  release()
  await expect(page.getByRole('dialog').getByLabel('Title', { exact: true })).toHaveValue(
    'New platform title'
  )
})
