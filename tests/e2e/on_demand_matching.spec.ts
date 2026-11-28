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
    artists: ['Tyler, The Creator'],
    releaseDate: '2001-02-03',
    length: 240000,
    albumName: 'Different album',
    coverArt: '/candidate.svg',
  },
  { ...platformItem, id: '22345678-1234-4234-8234-123456789abc', title: 'Other recording' },
]
async function submitPaste(page: Page) {
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
}

async function paste(page: Page) {
  await submitPaste(page)
  await expect(page.getByRole('dialog').getByLabel('Title', { exact: true })).toHaveValue(
    'Platform title'
  )
}

test('a first keyboard save closes without reporting its own row as a duplicate', async ({
  page,
}) => {
  await paste(page)
  const dialog = page.getByRole('dialog')
  const save = dialog.getByRole('button', { name: 'Add to List' })
  await save.focus()
  const trace = await dialog.evaluateHandle((element) => {
    const observed = { duplicate: false, refocusedDialog: false }
    element.addEventListener('focusin', ({ target }) => {
      if (target === element && element.dataset.state === 'open') observed.refocusedDialog = true
    })
    const observer = new MutationObserver(() => {
      if (element.dataset.state !== 'open') return observer.disconnect()
      if (element.querySelector('[role="status"]')?.textContent?.includes('Duplicate found')) {
        observed.duplicate = true
      }
    })
    observer.observe(element, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    })
    return observed
  })
  await save.press('Enter')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: platformItem.title })).toHaveCount(1)
  expect(await trace.jsonValue()).toEqual({ duplicate: false, refocusedDialog: false })
})

test('an update reported by explicit matching keeps the draft and returns candidates', async ({
  page,
}) => {
  await paste(page)
  const dialog = page.getByRole('dialog')
  const title = dialog.getByLabel('Title', { exact: true })
  await title.fill('My unfinished edit')
  const banner = page.getByRole('region', { name: 'Application update' })
  await expect(banner).not.toBeVisible()
  await page.route('**/library/listen-later?**', (route) =>
    route.fulfill({
      json: { serializedItems: candidates },
      headers: { 'X-App-Version': 'new-matching-test-version' },
    })
  )
  await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
  await expect(dialog.getByRole('button', { name: /Corrected title/ })).toBeVisible()
  await expect(banner).toBeVisible()
  await expect(title).toHaveValue('My unfinished edit')
})

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
  await expect(dialog.getByRole('region', { name: 'Proposed corrections' })).toContainText(
    'Corrected title'
  )
  await dialog.getByRole('button', { name: 'Apply corrections' }).click()
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Corrected title')
  await expect(dialog.getByLabel('Album', { exact: true })).toHaveValue('Platform album')
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  await expect(dialog).not.toBeVisible()
  await page.reload()
  await expect(page.getByRole('row').filter({ hasText: 'Corrected title' })).toContainText(
    'Tyler, The Creator'
  )
  const saved = await savedItems(page)
  expect(saved[0]).toMatchObject({
    id: platformItem.id,
    musicBrainzId: candidates[0].id,
    artists: ['Tyler, The Creator'],
    sourceUrl: SPOTIFY_URL,
    itemType: 'track',
    albumName: 'Platform album',
    coverArt: '/blank-album.svg',
    releaseDate: '2001-02-03',
  })
})

test('a comma in one credit is distinct from two credits when searching, reviewing and saving', async ({
  page,
}) => {
  const candidate = { ...candidates[0], title: platformItem.title }
  const searchCredits: string[][] = []
  await page.route('**/library/listen-later?**', (route) => {
    searchCredits.push(new URL(route.request().url()).searchParams.getAll('artists[]'))
    return route.fulfill({ json: { serializedItems: [candidate] } })
  })
  await page.goto('/library/listen-later')
  await seedListenLaterItems(page, [
    listenLaterSeed({
      id: 'two-credits',
      title: platformItem.title,
      artists: ['Tyler', 'The Creator'],
      itemType: 'track',
    }),
  ])
  await paste(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Artist', { exact: true }).fill('Tyler')
  const add = dialog.getByRole('button', { name: 'Add artist', exact: true })
  await add.press('Enter')
  const second = dialog.getByLabel('Artist 2', { exact: true })
  await expect(second).toBeFocused()
  await second.fill('The Creator')
  await dialog.getByRole('button', { name: 'Continue with new item' }).click()
  await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
  await dialog.getByRole('button', { name: /Tyler, The Creator/ }).click()
  const lists = dialog.getByRole('region', { name: 'Proposed corrections' }).getByRole('list')
  await expect(lists.nth(0).getByRole('listitem')).toHaveText(['Tyler', 'The Creator'])
  await expect(lists.nth(1).getByRole('listitem')).toHaveText(['Tyler, The Creator'])
  await dialog.getByRole('button', { name: 'Apply corrections' }).click()
  await expect(dialog.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
  await expect(dialog.getByRole('button', { name: /Tyler, The Creator/ })).toBeVisible()
  expect(searchCredits).toEqual([['Tyler', 'The Creator'], ['Tyler, The Creator']])
  await add.press('Enter')
  await expect(second).toBeFocused()
  await dialog.getByRole('button', { name: 'Remove artist 2' }).press('Enter')
  await expect(dialog.getByLabel('Artist', { exact: true })).toBeFocused()
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  await expect(dialog).not.toBeVisible()
  await page.reload()
  expect(await savedItems(page)).toContainEqual(
    expect.objectContaining({
      artists: ['Tyler, The Creator'],
      musicBrainzId: candidate.id,
    })
  )
})

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
]) {
  test(`selecting matches keeps candidate rows stable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.route('**/library/listen-later?**', (route) =>
      route.fulfill({ json: { serializedItems: candidates } })
    )
    await paste(page)
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
    const firstMatch = dialog.getByRole('button', { name: /Corrected title/ })
    const secondMatch = dialog.getByRole('button', { name: /Other recording/ })
    await expect(secondMatch).toBeVisible()
    const rows = dialog.getByRole('list', { name: 'MusicBrainz candidates' }).getByRole('listitem')
    const initialGeometry = await rows.evaluateAll((items) =>
      items.map((item) => ({
        height: item.getBoundingClientRect().height,
        top: (item as HTMLElement).offsetTop,
      }))
    )

    for (const match of [firstMatch, secondMatch, firstMatch]) {
      await match.click()
      await expect(match).toHaveAttribute('aria-pressed', 'true')
      expect(
        await rows.evaluateAll((items) =>
          items.map((item) => ({
            height: item.getBoundingClientRect().height,
            top: (item as HTMLElement).offsetTop,
          }))
        )
      ).toEqual(initialGeometry)
    }
  })
}

test('a chosen MusicBrainz cover changes only on Apply and survives reload', async ({ page }) => {
  await page.route('**/library/listen-later?**', (route) =>
    route.fulfill({ json: { serializedItems: candidates } })
  )
  await paste(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
  await dialog.getByRole('button', { name: /Corrected title/ }).click()
  await dialog.getByRole('radio', { name: 'Use MusicBrainz cover' }).check()
  await expect(dialog.getByAltText('Cover of Platform title')).toHaveAttribute(
    'src',
    platformItem.coverArt
  )
  await dialog.getByRole('button', { name: 'Apply corrections' }).click()
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  await expect(dialog).not.toBeVisible()
  await page.reload()
  const saved = await savedItems(page)
  expect(saved[0]).toMatchObject({
    coverArt: candidates[0].coverArt,
    albumName: platformItem.albumName,
    sourceUrl: SPOTIFY_URL,
    musicBrainzId: candidates[0].id,
  })
})

test('late cover events do not break cancelling a match or closing the dialog', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => {
    if (!error.message.includes('Failed to register a ServiceWorker')) errors.push(error.message)
  })
  await page.route('**/library/listen-later?**', (route) =>
    route.fulfill({ json: { serializedItems: candidates } })
  )
  await paste(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Find MusicBrainz matches' }).click()
  await dialog.getByRole('button', { name: /Corrected title/ }).click()
  await dialog.evaluate((element) => {
    const image = element.querySelector<HTMLImageElement>('img[alt="MusicBrainz cover"]')!
    const cancel = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Cancel matching'
    )!
    cancel.click()
    image.dispatchEvent(new Event('error'))
  })
  await expect(dialog.getByRole('region', { name: 'Proposed corrections' })).not.toBeVisible()
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(platformItem.title)
  await dialog.evaluate((element) => {
    const image = element.querySelector<HTMLImageElement>('img[alt="Cover of Platform title"]')!
    const cancel = Array.from(element.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Cancel'
    )!
    cancel.click()
    image.dispatchEvent(new Event('load'))
  })
  await expect(dialog).not.toBeVisible()
  expect(errors).toEqual([])
})

test('a saved album does not block adding its title track', async ({ page }) => {
  await page.goto('/library/listen-later')
  await seedListenLaterItems(page, [
    listenLaterSeed({
      id: 'album',
      title: platformItem.title,
      artists: platformItem.artists,
      itemType: 'album',
    }),
  ])
  await submitPaste(page)
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(platformItem.title)
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  await expect(dialog).not.toBeVisible()
  await page.reload()
  const saved = await savedItems(page)
  expect(saved.map((item) => item.itemType).sort()).toEqual(['album', 'track'])
})

for (const width of [320, 1280]) {
  test(`duplicate warning gates the incoming draft without changing the saved item (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await paste(page)
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    const savedDuplicate = {
      ...listenLaterSeed({
        id: 'saved-duplicate',
        title: platformItem.title,
        artists: platformItem.artists,
        itemType: 'track',
        hasBeenListened: true,
      }),
      albumName: 'Saved album',
      sourceUrl: 'https://music.apple.com/us/song/saved/123',
    }
    await seedListenLaterItems(page, [savedDuplicate])
    const before = await savedItems(page)
    const openDuplicate = async () => {
      await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
      await page.getByRole('button', { name: 'Add', exact: true }).click()
      await expect(dialog.getByRole('region', { name: 'Existing saved item' })).toContainText(
        'Saved album'
      )
      await expect(dialog.getByLabel('Title', { exact: true })).toHaveCount(0)
      await expect(dialog.getByRole('button', { name: 'Find MusicBrainz matches' })).toHaveCount(0)
      await expect(dialog.getByRole('button', { name: 'Add Anyway' })).toHaveCount(0)
    }
    await openDuplicate()
    const inputFocus = await dialog.evaluateHandle((element) => {
      const inputs: string[] = []
      element.addEventListener('focusin', ({ target }) => {
        if (target instanceof HTMLInputElement) inputs.push(target.id)
      })
      return inputs
    })
    await dialog.getByRole('button', { name: 'Continue with new item' }).press('Enter')
    await expect(dialog).toBeFocused()
    expect(await inputFocus.jsonValue()).toEqual([])
    await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(platformItem.title)
    await expect(dialog.getByLabel('Album', { exact: true })).toHaveValue(platformItem.albumName)
    expect(await savedItems(page)).toEqual(before)
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    expect(await savedItems(page)).toEqual(before)
    await openDuplicate()
    await dialog.getByRole('button', { name: 'Continue with new item' }).click()
    await dialog.getByLabel('Title', { exact: true }).fill('')
    await dialog
      .getByLabel('Title', { exact: true })
      .pressSequentially('Platform title — my new item')
    await dialog.getByRole('button', { name: 'Add to List' }).click()
    await expect(dialog).not.toBeVisible()
    await page.reload()
    const saved = await savedItems(page)
    expect(saved.find((item) => item.id === 'saved-duplicate')).toEqual(before[0])
    expect(saved.filter((item) => item.id !== 'saved-duplicate')).toEqual([
      expect.objectContaining({
        title: 'Platform title — my new item',
        albumName: platformItem.albumName,
        coverArt: platformItem.coverArt,
        sourceUrl: SPOTIFY_URL,
        hasBeenListened: false,
      }),
    ])
  })
}

test('editing into a different Duplicate requires a fresh warning without losing the draft', async ({
  page,
}) => {
  await paste(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
  await seedListenLaterItems(page, [
    listenLaterSeed({
      id: 'first',
      title: platformItem.title,
      artists: platformItem.artists,
      itemType: 'track',
    }),
    listenLaterSeed({
      id: 'second',
      title: 'Second saved title',
      artists: platformItem.artists,
      itemType: 'track',
    }),
  ])
  const before = await savedItems(page)
  await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Continue with new item' }).click()
  await dialog.getByLabel('Album', { exact: true }).fill('My incoming album edit')
  await dialog.getByLabel('Title', { exact: true }).fill('Second saved title')
  await expect(dialog.getByRole('region', { name: 'Existing saved item' })).toContainText(
    'Second saved title'
  )
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveCount(0)
  await expect(dialog).toBeFocused()
  await dialog.getByRole('button', { name: 'Continue with new item' }).click()
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue('Second saved title')
  await expect(dialog.getByLabel('Album', { exact: true })).toHaveValue('My incoming album edit')
  const title = dialog.getByLabel('Title', { exact: true })
  await title.fill('')
  await title.pressSequentially(`${platformItem.title} (live)`)
  await expect(title).toHaveValue(`${platformItem.title} (live)`)
  await expect(title).toBeFocused()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(await savedItems(page)).toEqual(before)
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

for (const field of ['Title', 'Artist', 'Item Type:']) {
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
    else
      await dialog
        .getByLabel(field, { exact: true })
        .fill(field === 'Artist' ? 'Earth, Wind & Fire' : 'My edited value')
    const linksRequest = page.waitForRequest((request) => request.url().includes('/api/links?'))
    await dialog.getByRole('button', { name: 'Add to List' }).click()
    const request = await linksRequest
    const query = new URL(request.url()).searchParams
    expect(query.has('mbid')).toBe(false)
    if (field === 'Artist') expect(query.getAll('artists[]')).toEqual(['Earth, Wind & Fire'])
    else
      expect(query.get(field === 'Item Type:' ? 'type' : 'title')).toBe(
        field === 'Item Type:' ? 'album' : 'My edited value'
      )
    await page.reload()
    const saved = await savedItems(page)
    expect(saved[0].musicBrainzId).toBeUndefined()
    if (field === 'Artist') expect(saved[0].artists).toEqual(['Earth, Wind & Fire'])
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
  await dialog.getByRole('button', { name: 'Continue with new item' }).click()
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(platformItem.title)
  release()
  await expect(dialog.getByRole('region', { name: 'Proposed corrections' })).not.toBeVisible()
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
  await dialog.getByLabel('Artist', { exact: true }).fill('')
  await dialog.getByLabel('Title', { exact: true }).fill('My platform title')
  const linksRequest = page.waitForRequest((request) => request.url().includes('/api/links?'))
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  const request = await linksRequest
  const query = new URL(request.url()).searchParams
  expect(query.has('mbid')).toBe(false)
  expect(query.get('title')).toBe('My platform title')
  expect(query.getAll('artists[]')).toEqual([])
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
  await page.setViewportSize({ width: 320, height: 568 })
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
  await dialog.getByLabel('Artist', { exact: true }).fill('Edited search artist')
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
  expect(query.getAll('artists[]')).toEqual(['Edited search artist'])
  expect(query.get('type')).toBe('track')
  await dialog.getByRole('button', { name: /Corrected title/ }).click()
  await expect(dialog.getByRole('button', { name: 'Add to List' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Apply corrections' }).click()
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveCount(0)
  await expect(dialog).toBeFocused()
  await dialog.getByRole('button', { name: 'Continue with new item' }).click()
  await expect(dialog.getByLabel('Title', { exact: true })).toHaveValue(candidates[0].title)
  await expect(dialog.getByText(/^MusicBrainz match$/i)).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Add Anyway' })).toBeVisible()
  await dialog.getByLabel('Title', { exact: true }).fill('Different version')
  await expect(dialog.getByRole('button', { name: 'Add to List' })).toBeVisible()
  await dialog.getByLabel('Title', { exact: true }).fill(candidates[0].title)
  await dialog.getByRole('button', { name: 'View Existing' }).press('Enter')
  await expect(dialog).not.toBeVisible()
  const existingCard = page.locator('#mobile-item-existing')
  await expect(existingCard).toBeFocused()
  await expect(existingCard).toBeInViewport()
  await expect(existingCard).toHaveClass(/bg-warning\/20/)
})

test('Cancel keeps keyboard focus when pending metadata reveals a duplicate', async ({ page }) => {
  await paste(page)
  const dialog = page.getByRole('dialog')
  const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true })
  await cancel.click()
  await seedListenLaterItems(page, [
    listenLaterSeed({
      id: 'existing',
      title: platformItem.title,
      artists: platformItem.artists,
      itemType: 'track',
    }),
  ])
  const { promise: held, resolve: release } = Promise.withResolvers<void>()
  await page.route('**/api/platform-metadata', async (route) => {
    await held
    await route.fallback()
  })
  await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(dialog.getByText('Loading metadata...')).toBeVisible()
  await cancel.focus()
  release()
  await expect(dialog.getByRole('region', { name: 'Existing saved item' })).toBeVisible()
  await expect(cancel).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog).not.toBeVisible()
})

test('keeping the saved item focuses the desktop row without changing Cancel focus restoration', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/library/listen-later')
  await seedListenLaterItems(page, [
    listenLaterSeed({
      id: 'existing',
      title: platformItem.title,
      artists: platformItem.artists,
      itemType: 'track',
    }),
  ])
  await submitPaste(page)

  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Keep existing only' }).press('Enter')
  await expect(dialog).not.toBeVisible()
  const existingRow = page.getByRole('row').filter({ hasText: platformItem.title })
  await expect(existingRow).toBeFocused()
  await expect(existingRow).toBeInViewport()
  await expect(existingRow).toHaveClass(/bg-warning\/20/)

  const add = page.getByRole('button', { name: 'Add', exact: true })
  await add.press('Enter')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).press('Enter')
  await expect(dialog).not.toBeVisible()
  await expect(add).toBeFocused()
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

for (const { outcome, status, message } of [
  { outcome: 'success', status: 200, message: 'Choose a match to review.' },
  {
    outcome: 'failure',
    status: 503,
    message: 'MusicBrainz search failed. Retry or save without a match.',
  },
]) {
  test(`keyboard focus survives matching ${outcome} and busy activation cannot duplicate requests`, async ({
    page,
  }) => {
    const { promise: held, resolve: release } = Promise.withResolvers<void>()
    let requests = 0
    await page.route('**/library/listen-later?**', async (route) => {
      requests++
      await held
      await route.fulfill({ status, json: { serializedItems: candidates } })
    })
    await paste(page)
    const dialog = page.getByRole('dialog')
    const find = dialog.getByRole('button', { name: 'Find MusicBrainz matches' })
    await find.focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => requests).toBe(1)
    await expect(find).toHaveAttribute('aria-disabled', 'true')
    await expect(find).toHaveAttribute('aria-busy', 'true')
    await expect(find).toBeFocused()
    expect(await find.evaluate((button: HTMLButtonElement) => button.disabled)).toBe(false)

    await page.keyboard.press('Enter')
    await page.keyboard.press('Space')
    await find.click({ force: true })
    await expect(find).toBeFocused()
    release()

    await expect(dialog.getByText(message, { exact: true })).toBeVisible()
    await expect(find).toBeFocused()
    await expect(find).not.toHaveAttribute('aria-disabled', 'true')
    await expect(find).toHaveAttribute('aria-busy', 'false')
    expect(requests).toBe(1)

    await page.keyboard.press('Enter')
    await expect.poll(() => requests).toBe(2)
    await expect(find).toHaveAttribute('aria-busy', 'false')
    await expect(find).toBeFocused()
  })
}

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
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Add to List' }).click()
  await expect(dialog).not.toBeVisible()
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
