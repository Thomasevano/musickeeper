import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { DB_CONFIG } from '../../src/infrastructure/storage/listen_later_storage.js'

const SPOTIFY_URL = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'

const mockMetadataResponse = {
  musicItem: {
    id: 'mb-track-456',
    title: 'Never Gonna Give You Up',
    releaseDate: '2023-06-15',
    length: 180000,
    artists: ['Rick Astley'],
    albumName: 'Whenever You Need Somebody',
    itemType: 'track',
    coverArt: 'https://coverartarchive.org/test-cover.jpg',
  },
  source: 'musicbrainz',
  linkMetadata: {
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    type: 'track',
    thumbnailUrl:
      'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e02255e131abc1410833be95673',
    originalUrl: SPOTIFY_URL,
    albumName: 'Whenever You Need Somebody',
  },
}

interface ListenLaterItemSeed {
  id: string
  title: string
  releaseDate?: string
  artists: string[]
  itemType: 'track' | 'album'
  hasBeenListened: boolean
  addedAt: number
  externalLinks?: {
    platform: string
    label: string
    url: string
    category: 'stream' | 'buy'
  }[]
}

type ListenLaterSeedOverrides = Pick<ListenLaterItemSeed, 'id' | 'title'> &
  Partial<Omit<ListenLaterItemSeed, 'id' | 'title'>>

function listenLaterSeed(overrides: ListenLaterSeedOverrides): ListenLaterItemSeed {
  return {
    artists: ['Artist'],
    itemType: 'album',
    hasBeenListened: false,
    addedAt: 1,
    ...overrides,
  }
}

// The "Add" link button shares its accessible-name prefix with the sortable
// "Added" column header, so it must be matched exactly.
const addLinkButton = (page: Page) => page.getByRole('button', { name: 'Add', exact: true })

// The search combobox is labelled "Song or album title", which contains both
// "Title" and "Album" as substrings. Scope editable-field lookups to the dialog.
const dialogField = (page: Page, label: string) =>
  page.getByRole('dialog').getByLabel(label, { exact: true })

async function expectMinTouchTarget(locator: Locator) {
  await expect(locator).toBeVisible()
  await expect
    .poll(() => locator.evaluate((element) => element.getBoundingClientRect().height))
    .toBeGreaterThanOrEqual(44)
}

async function expectAllMinTouchTargets(locator: Locator) {
  const count = await locator.count()
  expect(count).toBeGreaterThan(0)
  for (let index = 0; index < count; index += 1) {
    await expectMinTouchTarget(locator.nth(index))
  }
}

async function expectStacked(first: Locator, second: Locator) {
  await expect
    .poll(async () => {
      const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()])
      return !!firstBox && !!secondBox && secondBox.y >= firstBox.y + firstBox.height
    })
    .toBe(true)
}

async function addSpotifyItem(page: Page) {
  await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
  await addLinkButton(page).click()
  await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()
  await page.getByRole('button', { name: 'Add to List' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
}
async function seedListenLaterItems(page: Page, items: ListenLaterItemSeed[]) {
  // The evaluate body runs in the browser and cannot import the store, so the
  // schema is passed in: DB_CONFIG stays the single source of the name and
  // version, and a bump cannot leave this seed opening an older database.
  await page.evaluate(
    async ({ config, seed }) => {
      const opening = Promise.withResolvers<IDBDatabase>()
      const request = indexedDB.open(config.name, config.version)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(config.storeName)) {
          database.createObjectStore(config.storeName, { keyPath: 'id', autoIncrement: true })
        }
      }
      request.onsuccess = () => opening.resolve(request.result)
      request.onerror = () => opening.reject(request.error)
      const db = await opening.promise

      const writing = Promise.withResolvers<void>()
      const transaction = db.transaction(config.storeName, 'readwrite')
      const store = transaction.objectStore(config.storeName)
      store.clear()
      for (const item of seed) store.add(item)
      transaction.oncomplete = () => writing.resolve()
      transaction.onerror = () => writing.reject(transaction.error)
      await writing.promise

      db.close()
    },
    { config: DB_CONFIG, seed: items }
  )
  await page.reload()
}

test.describe('listen later page', () => {
  test('loads the page', async ({ page }) => {
    await page.goto('/library/listen-later')
    await expect(page).toHaveTitle(/Listen Later/)
  })
})

test.describe('paste link - add valid link', () => {
  test('paste a spotify link, confirm, and item appears in list with toast', async ({ page }) => {
    // Mock the metadata API
    await page.route('**/api/link/metadata', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMetadataResponse),
      })
    })

    await page.goto('/library/listen-later')

    // Paste a link into the input
    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill(SPOTIFY_URL)

    // Click Add button
    await addLinkButton(page).click()

    // Dialog opens with the correct title
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()

    // Editable fields are populated
    await expect(dialogField(page, 'Title')).toHaveValue('Never Gonna Give You Up')
    await expect(dialogField(page, 'Artists')).toHaveValue('Rick Astley')
    await expect(dialogField(page, 'Album')).toHaveValue('Whenever You Need Somebody')

    // Source badge is shown
    await expect(page.getByText('MusicBrainz Match')).toBeVisible()

    // Click "Add to List"
    await page.getByRole('button', { name: 'Add to List' }).click()

    // Dialog closes
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Item appears in the list table (title cell also holds the album subtitle,
    // and a cover cell carries "Cover of <title>", so match the row instead).
    const addedRow = page.getByRole('row').filter({ hasText: 'Never Gonna Give You Up' })
    await expect(addedRow).toBeVisible()
    await expect(addedRow).toContainText('Rick Astley')

    // Success toast appears
    await expect(page.getByText('"Never Gonna Give You Up" added to your list')).toBeVisible()
  })
})

test.describe('paste link - invalid link errors', () => {
  test('shows client-side error for invalid URL format', async ({ page }) => {
    await page.goto('/library/listen-later')

    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill('not-a-valid-url')

    await addLinkButton(page).click()

    // Client-side validation error shown inline
    await expect(page.getByText('Please enter a valid URL')).toBeVisible()

    // Dialog should NOT open
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('shows error in dialog for unsupported platform', async ({ page }) => {
    await page.route('**/api/link/metadata', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unsupported platform. Supported: Spotify, YouTube, Apple Music, SoundCloud',
        }),
      })
    })

    await page.goto('/library/listen-later')

    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill('https://tidal.com/browse/track/12345')

    await addLinkButton(page).click()

    // Dialog opens with error state
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Unable to Process Link' })).toBeVisible()
    await expect(page.getByText('Unsupported platform')).toBeVisible()
    await expect(page.getByText('Supported platforms:')).toBeVisible()

    // Retry and Cancel buttons are available
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()

    // Cancel closes the dialog
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('shows error in dialog when API returns server error', async ({ page }) => {
    await page.route('**/api/link/metadata', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to fetch metadata from spotify' }),
      })
    })

    await page.goto('/library/listen-later')

    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill(SPOTIFY_URL)

    await addLinkButton(page).click()

    // Dialog opens with error
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Failed to fetch metadata')).toBeVisible()
  })

  test('add button is disabled when input is empty', async ({ page }) => {
    await page.goto('/library/listen-later')

    await expect(addLinkButton(page)).toBeDisabled()
  })
})

test.describe('paste link - duplicate detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/link/metadata', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMetadataResponse),
      })
    })

    await page.goto('/library/listen-later')

    // Add an item first
    await addSpotifyItem(page)
  })

  test('shows duplicate warning when pasting same link again', async ({ page }) => {
    // Paste the same link again
    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill(SPOTIFY_URL)
    await addLinkButton(page).click()

    // Dialog shows duplicate state
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Duplicate Found' })).toBeVisible()
    await expect(page.getByText('the same title and the same artists')).toBeVisible()

    // Shows existing item info
    await expect(page.getByText('Existing item in your list')).toBeVisible()

    // Duplicate-specific buttons are present
    await expect(page.getByRole('button', { name: 'Add Anyway' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'View Existing' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
  })

  test('add anyway adds a second copy of the item', async ({ page }) => {
    // Override mock to return a different ID for the second paste
    let callCount = 0
    await page.unroute('**/api/link/metadata')
    await page.route('**/api/link/metadata', (route) => {
      callCount++
      const response = {
        ...mockMetadataResponse,
        musicItem: {
          ...mockMetadataResponse.musicItem,
          id: `link-${callCount + 1}`,
        },
      }
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    })

    // Paste the same link again
    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill(SPOTIFY_URL)
    await addLinkButton(page).click()

    // Wait for duplicate dialog to fully load
    await expect(page.getByRole('heading', { name: 'Duplicate Found' })).toBeVisible()

    // Click "Add Anyway"
    await page.getByRole('button', { name: 'Add Anyway' }).click()

    // Two rows now exist with the same title
    const duplicateRows = page.getByRole('row').filter({ hasText: 'Never Gonna Give You Up' })
    await expect(duplicateRows).toHaveCount(2)
  })

  test('view existing closes dialog and scrolls to the item', async ({ page }) => {
    // Paste the same link again
    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill(SPOTIFY_URL)
    await addLinkButton(page).click()

    // Click "View Existing"
    await page.getByRole('button', { name: 'View Existing' }).click()

    // Dialog closes
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})

test.describe('paste link - edit fields before saving', () => {
  test('edited title, artists, and album are saved to the list', async ({ page }) => {
    await page.route('**/api/link/metadata', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMetadataResponse),
      })
    })

    await page.goto('/library/listen-later')

    // Paste a link
    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill(SPOTIFY_URL)
    await addLinkButton(page).click()

    // Wait for dialog with data
    await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()

    // Edit the title
    const titleInput = dialogField(page, 'Title')
    await titleInput.clear()
    await titleInput.fill('Together Forever')

    // Edit the artists
    const artistsInput = dialogField(page, 'Artists')
    await artistsInput.clear()
    await artistsInput.fill('Rick Astley, Someone Else')

    // Edit the album
    const albumInput = dialogField(page, 'Album')
    await albumInput.clear()
    await albumInput.fill('Hold Me in Your Arms')

    // Confirm
    await page.getByRole('button', { name: 'Add to List' }).click()

    // Edited values appear in the list (album shows as a subtitle in the title cell)
    const editedRow = page.getByRole('row').filter({ hasText: 'Together Forever' })
    await expect(editedRow).toBeVisible()
    await expect(editedRow).toContainText('Rick Astley, Someone Else')
    await expect(editedRow).toContainText('Hold Me in Your Arms')

    // Toast shows the edited title
    await expect(page.getByText('"Together Forever" added to your list')).toBeVisible()
  })

  test('add to list button is disabled when title is cleared', async ({ page }) => {
    await page.route('**/api/link/metadata', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMetadataResponse),
      })
    })

    await page.goto('/library/listen-later')

    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill(SPOTIFY_URL)
    await addLinkButton(page).click()

    await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()

    // Clear the title
    const titleInput = dialogField(page, 'Title')
    await titleInput.clear()

    // Add to List button should be disabled
    await expect(page.getByRole('button', { name: 'Add to List' })).toBeDisabled()

    // Type something back
    await titleInput.fill('New Title')
    await expect(page.getByRole('button', { name: 'Add to List' })).toBeEnabled()
  })
})

test.describe('paste link - album type hides album field', () => {
  const mockAlbumResponse = {
    musicItem: {
      id: 'mb-album-789',
      title: 'Discovery',
      releaseDate: '2001-03-12',
      artists: ['Daft Punk'],
      albumName: 'Discovery',
      itemType: 'album',
      coverArt: 'https://i.scdn.co/image/discovery.jpg',
    },
    source: 'musicbrainz',
    linkMetadata: {
      title: 'Discovery',
      artist: 'Daft Punk',
      type: 'album',
      thumbnailUrl: 'https://i.scdn.co/image/discovery.jpg',
      originalUrl: 'https://open.spotify.com/album/2noRn2Aes5aoNVsU6iWThc',
      albumName: 'Discovery',
    },
  }

  test('hides album field when type is album', async ({ page }) => {
    await page.route('**/api/link/metadata', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAlbumResponse),
      })
    })

    await page.goto('/library/listen-later')

    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill('https://open.spotify.com/album/2noRn2Aes5aoNVsU6iWThc')
    await addLinkButton(page).click()

    await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()

    // Title and Artists fields are visible
    await expect(dialogField(page, 'Title')).toBeVisible()
    await expect(dialogField(page, 'Artists')).toBeVisible()

    // Album field is NOT shown for album type
    await expect(dialogField(page, 'Album')).not.toBeVisible()
  })

  test('shows album field when type is track', async ({ page }) => {
    await page.route('**/api/link/metadata', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMetadataResponse),
      })
    })

    await page.goto('/library/listen-later')

    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill(SPOTIFY_URL)
    await addLinkButton(page).click()

    await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()

    // All three fields are visible for track type
    await expect(dialogField(page, 'Title')).toBeVisible()
    await expect(dialogField(page, 'Artists')).toBeVisible()
    await expect(dialogField(page, 'Album')).toBeVisible()
  })
})

test.describe('delete item', () => {
  test('delete removes the item from the list and shows a toast', async ({ page }) => {
    await page.route('**/api/link/metadata', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMetadataResponse),
      })
    })

    await page.goto('/library/listen-later')

    // First add an item (establishes this test's own state)
    await addSpotifyItem(page)

    // Verify item is in the list
    const itemRow = page.getByRole('row').filter({ hasText: 'Never Gonna Give You Up' })
    await expect(itemRow).toBeVisible()

    // Open the row actions menu and choose Delete
    await itemRow.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()

    // Confirm deletion in the confirmation dialog
    await expect(page.getByRole('heading', { name: 'Are you sure?' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirm' }).click()

    // Item is removed from the list
    await expect(itemRow).not.toBeVisible()

    // Empty state message appears
    await expect(page.getByText('Add your first item by searching above')).toBeVisible()

    // Success toast appears
    await expect(page.getByText('"Never Gonna Give You Up" removed from your list')).toBeVisible()
  })
})

test.describe('artist-only search', () => {
  test('omits the empty title query from the search request', async ({ page }) => {
    const searchUrls: string[] = []

    await page.route('**/library/listen-later*', async (route) => {
      const url = new URL(route.request().url())

      if (!url.searchParams.has('type')) {
        await route.continue()
        return
      }

      searchUrls.push(url.toString())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ serializedItems: [] }),
      })
    })

    await page.goto('/library/listen-later')
    await page.getByLabel('Artist name', { exact: true }).fill('angele')

    await expect.poll(() => searchUrls.length).toBeGreaterThan(0)

    const requestUrl = new URL(searchUrls[0])
    expect(requestUrl.searchParams.get('artist')).toBe('angele')
    expect(requestUrl.searchParams.has('q')).toBe(false)
  })
})

test.describe('search results - add and remove', () => {
  test('adding then removing from the search results toasts and updates the list', async ({
    page,
  }) => {
    await page.route('**/api/links*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ externalLinks: [] }),
      })
    })

    await page.route('**/library/listen-later*', async (route) => {
      const url = new URL(route.request().url())

      if (!url.searchParams.has('type')) {
        await route.continue()
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ serializedItems: [mockMetadataResponse.musicItem] }),
      })
    })

    await page.goto('/library/listen-later')
    await page.getByLabel('Artist name', { exact: true }).fill('Rick Astley')

    const searchResult = page.getByRole('option', {
      name: 'Add Never Gonna Give You Up to listen later',
    })
    await searchResult.click()

    await expect(page.getByText('"Never Gonna Give You Up" added to your list')).toBeVisible()

    const itemRow = page.getByRole('row').filter({ hasText: 'Never Gonna Give You Up' })
    await expect(itemRow).toBeVisible()

    const savedResult = page.getByRole('option', {
      name: 'Remove Never Gonna Give You Up from listen later',
    })
    await savedResult.click()

    await expect(page.getByText('"Never Gonna Give You Up" removed from your list')).toBeVisible()
    await expect(itemRow).not.toBeVisible()
  })
})

test.describe('table filters', () => {
  test('combines type and listened-status filters', async ({ page }) => {
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [
      listenLaterSeed({
        id: 'album-not-listened',
        title: 'Unheard album',
        releaseDate: '2024-01-01',
        artists: ['Album Artist'],
      }),
      listenLaterSeed({
        id: 'album-listened',
        title: 'Heard album',
        releaseDate: '2024-01-02',
        artists: ['Album Artist'],
        hasBeenListened: true,
        addedAt: 2,
      }),
      listenLaterSeed({
        id: 'track-not-listened',
        title: 'Unheard track',
        releaseDate: '2024-01-03',
        artists: ['Track Artist'],
        itemType: 'track',
        addedAt: 3,
      }),
    ])

    await page.getByRole('button', { name: 'Type: All', exact: true }).click()
    await page.getByRole('option', { name: 'Albums', exact: true }).click()
    await page.getByRole('button', { name: 'Status: All', exact: true }).click()
    await page.getByRole('option', { name: 'Not listened', exact: true }).click()

    await expect(page.getByText('1 item(s)')).toBeVisible()
    await expect(page.locator('#item-album-not-listened')).toBeVisible()
    await expect(page.locator('#item-album-listened')).not.toBeVisible()
    await expect(page.locator('#item-track-not-listened')).not.toBeVisible()
  })
})

test.describe('desktop sorting', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('exposes sort direction to assistive technology', async ({ page }) => {
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [
      listenLaterSeed({ id: 'sort-zebra', title: 'Zebra', artists: ['Zebra Artist'] }),
      listenLaterSeed({ id: 'sort-apple', title: 'Apple', artists: ['Apple Artist'] }),
    ])

    const artistsButton = page.getByRole('button', { name: 'Artists, not sorted', exact: true })
    const artistsHeader = page.locator('th').filter({ has: artistsButton })
    await expect(artistsHeader).toHaveAttribute('aria-sort', 'none')

    await artistsButton.click()
    const ascendingButton = page.getByRole('button', {
      name: 'Artists, sorted ascending',
      exact: true,
    })
    await expect(page.locator('th').filter({ has: ascendingButton })).toHaveAttribute(
      'aria-sort',
      'ascending'
    )
    await expect(ascendingButton).toBeVisible()

    await page.setViewportSize({ width: 320, height: 568 })
    await expect(
      page.getByRole('button', { name: 'Sort: Artists (A–Z)', exact: true })
    ).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 800 })

    await ascendingButton.click()
    const descendingButton = page.getByRole('button', {
      name: 'Artists, sorted descending',
      exact: true,
    })
    await expect(page.locator('th').filter({ has: descendingButton })).toHaveAttribute(
      'aria-sort',
      'descending'
    )
    await expect(descendingButton).toBeVisible()

    const columnChooser = page.getByRole('button', { name: 'Columns', exact: true })
    await expect(columnChooser).toBeVisible()

    await page.setViewportSize({ width: 320, height: 568 })
    await expect(columnChooser).not.toBeVisible()
    const mobileSortTrigger = page.getByRole('button', {
      name: 'Sort: Artists (Z–A)',
      exact: true,
    })
    await expect(mobileSortTrigger).toBeVisible()
    await mobileSortTrigger.click()
    await page.getByRole('option', { name: 'Added (oldest)', exact: true }).click()
    await expect(
      page.getByRole('button', { name: 'Sort: Added (oldest)', exact: true })
    ).toBeVisible()

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.getByRole('button', { name: 'Title, not sorted', exact: true }).click()
    await page.setViewportSize({ width: 320, height: 568 })
    await expect(
      page.getByRole('button', { name: 'Sort: Title (ascending)', exact: true })
    ).toBeVisible()
  })
})

test.describe('desktop navigation', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('hides the compact navigation trigger', async ({ page }) => {
    await page.goto('/')

    // The trigger's `md:hidden` is forwarded through a bits-ui child snippet, so
    // a stray `class` on the Button silently drops it and ships the burger on
    // desktop next to the inline links.
    await expect(page.getByRole('button', { name: 'Open navigation' })).not.toBeVisible()
    await expect(page.getByRole('link', { name: 'Features' })).toBeVisible()
  })
})

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test('removes sheet travel under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('button', { name: 'Open navigation' }).click()
    const sheet = page.getByRole('dialog')

    await expect(sheet).toBeVisible()
    const motion = await sheet.evaluate((element) => ({
      reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      transforms: element.getAnimations().flatMap((animation) => {
        if (!(animation.effect instanceof KeyframeEffect)) return []
        return animation.effect.getKeyframes().map((frame) => String(frame.transform ?? 'none'))
      }),
    }))
    expect(motion.reduced).toBe(true)
    expect(motion.transforms.length).toBeGreaterThan(0)
    expect(
      motion.transforms.filter(
        (transform) => transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)'
      )
    ).toEqual([])
  })
})

test.describe('mobile breakpoint controls', () => {
  test.use({ viewport: { width: 700, height: 800 } })

  test('keeps interactive controls at least 44px', async ({ page }) => {
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [
      listenLaterSeed({
        id: 'touch-target-item',
        title: 'Touch target item',
        externalLinks: [
          {
            platform: 'deezer',
            label: 'Deezer',
            url: 'https://www.deezer.com/album/1',
            category: 'stream',
          },
        ],
      }),
    ])

    const mobileCard = page.locator('#mobile-item-touch-target-item')
    const controls = [
      page.locator('#link-url'),
      addLinkButton(page),
      page.locator('#search-type'),
      page.locator('#search-title'),
      page.locator('#search-artist'),
      page.getByRole('button', { name: 'Status: All', exact: true }),
      page.getByRole('button', { name: 'Type: All', exact: true }),
      page.getByRole('button', { name: 'Sort: Added (oldest)', exact: true }),
      mobileCard.getByRole('button', { name: 'Open menu' }),
      mobileCard.getByRole('link', { name: 'Deezer' }),
      page.getByRole('button', { name: 'Previous' }),
      page.getByRole('button', { name: 'Next' }),
      page.getByRole('button', { name: 'Open navigation' }),
      page.getByRole('link', { name: 'MusicKeeper home', exact: true }),
    ]

    for (const control of controls) await expectMinTouchTarget(control)

    const selectTriggers = [
      page.locator('#search-type'),
      page.getByRole('button', { name: 'Status: All', exact: true }),
      page.getByRole('button', { name: 'Type: All', exact: true }),
      page.getByRole('button', { name: 'Sort: Added (oldest)', exact: true }),
    ]
    for (const trigger of selectTriggers) {
      await trigger.click()
      await expectAllMinTouchTargets(
        page.locator('[data-slot="select-content"][data-state="open"]').getByRole('option')
      )
      await page.keyboard.press('Escape')
    }

    await mobileCard.getByRole('button', { name: 'Open menu' }).click()
    await expectAllMinTouchTargets(page.getByRole('menuitem'))
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: 'Open navigation' }).click()
    const navigation = page.getByRole('navigation', { name: 'Mobile navigation' })
    await expectMinTouchTarget(navigation.getByRole('link', { name: 'Features' }))
    await expectMinTouchTarget(navigation.getByRole('link', { name: 'Blog' }))
    await expectMinTouchTarget(page.getByRole('button', { name: 'Toggle theme' }))
    await page.getByRole('button', { name: 'Toggle theme' }).click()
    await expectAllMinTouchTargets(page.getByRole('menuitem'))
    await page.keyboard.press('Escape')
    await expectMinTouchTarget(page.getByRole('button', { name: 'Close', exact: true }))
  })
})

test.describe('mobile navigation', () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test('opens the compact navigation sheet', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Open navigation' }).click()

    const navigation = page.getByRole('navigation', { name: 'Mobile navigation' })
    await expect(navigation).toBeVisible()
    await expect(navigation.getByRole('link', { name: 'Features' })).toBeVisible()
    await navigation.getByRole('link', { name: 'Features' }).click()
    await expect(page).toHaveURL(/\/#features$/)
    await expect(navigation).not.toBeVisible()
  })

  test('closes the compact navigation sheet at the desktop breakpoint', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Open navigation' }).click()
    const navigation = page.getByRole('navigation', { name: 'Mobile navigation' })
    await expect(navigation).toBeVisible()

    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(navigation).not.toBeVisible()
    await expect(page.getByRole('link', { name: 'Features' })).toBeVisible()
  })

  test('keeps both filters full width and filters mobile cards', async ({ page }) => {
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [
      listenLaterSeed({
        id: 'filter-listened-track',
        title: 'Listened track',
        itemType: 'track',
        hasBeenListened: true,
      }),
      listenLaterSeed({
        id: 'filter-unlistened-album',
        title: 'Unlistened album',
      }),
    ])

    for (const name of ['Status: All', 'Type: All']) {
      const filter = page.getByRole('button', { name, exact: true })
      await expect(filter).toBeVisible()
      await expect
        .poll(() => filter.evaluate((element) => element.getBoundingClientRect().width))
        .toBeGreaterThanOrEqual(250)
    }

    const listenedTrack = page.locator('#mobile-item-filter-listened-track')
    const unlistenedAlbum = page.locator('#mobile-item-filter-unlistened-album')

    await page.getByRole('button', { name: 'Status: All', exact: true }).click()
    await page.getByRole('option', { name: 'Listened', exact: true }).click()
    await expect(listenedTrack).toBeVisible()
    await expect(unlistenedAlbum).not.toBeVisible()

    await page.getByRole('button', { name: 'Status: Listened', exact: true }).click()
    await page.getByRole('option', { name: 'All', exact: true }).click()
    await page.getByRole('button', { name: 'Type: All', exact: true }).click()
    await page.getByRole('option', { name: 'Albums', exact: true }).click()
    await expect(listenedTrack).not.toBeVisible()
    await expect(unlistenedAlbum).toBeVisible()
  })

  test('retains shared controls and presents mobile cards', async ({ page }) => {
    const longTitle = 'ColumnChooserItem'.repeat(24)
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [
      listenLaterSeed({
        id: 'column-chooser-item',
        title: longTitle,
        itemType: 'track',
        externalLinks: [
          {
            platform: 'spotify',
            label: 'Spotify',
            url: 'https://open.spotify.com',
            category: 'stream',
          },
        ],
      }),
    ])

    const mobileCard = page.locator('#mobile-item-column-chooser-item')
    const platformLink = mobileCard.getByRole('link', { name: 'Spotify' })

    await expect(mobileCard).toContainText(longTitle)
    await expect(mobileCard).toContainText('Artist')
    await expect(mobileCard.getByText('Track', { exact: true })).toBeVisible()
    await expect(mobileCard.getByText('Not listened', { exact: true })).toBeVisible()
    await expect(mobileCard.getByRole('button', { name: 'Open menu' })).toBeVisible()
    await expect(platformLink).toBeVisible()
    await expectMinTouchTarget(platformLink)
    await expectStacked(page.locator('#link-url'), addLinkButton(page))
    await expectStacked(page.locator('#search-title'), page.locator('#search-artist'))
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
        )
      )
      .toBe(true)
  })

  test('opens a Deezer album from a mobile card', async ({ page }) => {
    await page.context().route('https://www.deezer.com/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<title>Deezer album</title>',
      })
    )
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [
      listenLaterSeed({
        id: 'deezer-item',
        title: 'Deezer album',
        externalLinks: [
          {
            platform: 'deezer',
            label: 'Deezer',
            url: 'https://www.deezer.com/album/1',
            category: 'stream',
          },
        ],
      }),
    ])

    const popupPromise = page.waitForEvent('popup')
    await page.locator('#mobile-item-deezer-item').getByRole('link', { name: 'Deezer' }).click()
    const popup = await popupPromise
    await expect(popup).toHaveURL('https://www.deezer.com/album/1')
  })

  test('marks an item as listened from a mobile card', async ({ page }) => {
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [
      listenLaterSeed({
        id: 'mobile-listened-item',
        title: 'Mobile listened item',
      }),
    ])

    const mobileCard = page.locator('#mobile-item-mobile-listened-item')
    await expect(mobileCard.getByText('Not listened', { exact: true })).toBeVisible()
    await mobileCard.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('menuitem', { name: 'Mark as listened' }).click()
    await expect(mobileCard.getByText('Listened', { exact: true })).toBeVisible()

    await page.reload()
    await expect(mobileCard.getByText('Listened', { exact: true })).toBeVisible()
  })

  test('deletes an item through confirmation from a mobile card', async ({ page }) => {
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [
      listenLaterSeed({
        id: 'mobile-delete-item',
        title: 'Mobile delete item',
      }),
    ])

    const mobileCard = page.locator('#mobile-item-mobile-delete-item')
    await mobileCard.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(page.getByRole('heading', { name: 'Are you sure?' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(mobileCard).not.toBeVisible()
    await expect(page.getByText('Add your first item by searching above')).toBeVisible()

    await page.reload()
    await expect(mobileCard).not.toBeVisible()
  })

  test('sorts saved items by artist and added date', async ({ page }) => {
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [
      listenLaterSeed({
        id: 'old-zebra',
        title: 'Old Zebra album',
        releaseDate: '2024-01-01',
        artists: ['Zebra Artist'],
        addedAt: 2,
      }),
      listenLaterSeed({
        id: 'new-apple',
        title: 'New Apple album',
        releaseDate: '2024-01-02',
        artists: ['Apple Artist'],
      }),
      listenLaterSeed({
        id: 'middle-mango',
        title: 'Middle Mango album',
        releaseDate: '2024-01-03',
        artists: ['Mango Artist'],
        addedAt: 3,
      }),
    ])
    const mobileItems = page.locator('article[id^="mobile-item-"]')

    await page.getByRole('button', { name: 'Sort: Added (oldest)', exact: true }).click()
    await page.getByRole('option', { name: 'Artists (A–Z)', exact: true }).click()
    await expect
      .poll(() => mobileItems.evaluateAll((items) => items.map((item) => item.id)))
      .toEqual(['mobile-item-new-apple', 'mobile-item-middle-mango', 'mobile-item-old-zebra'])

    await page.getByRole('button', { name: 'Sort: Artists (A–Z)', exact: true }).click()
    await page.getByRole('option', { name: 'Added (newest)', exact: true }).click()
    await expect
      .poll(() => mobileItems.evaluateAll((items) => items.map((item) => item.id)))
      .toEqual(['mobile-item-middle-mango', 'mobile-item-old-zebra', 'mobile-item-new-apple'])

    await page.getByRole('button', { name: 'Sort: Added (newest)', exact: true }).click()
    await page.getByRole('option', { name: 'Added (oldest)', exact: true }).click()
    await expect
      .poll(() => mobileItems.evaluateAll((items) => items.map((item) => item.id)))
      .toEqual(['mobile-item-new-apple', 'mobile-item-old-zebra', 'mobile-item-middle-mango'])
  })
})

test.describe('add performance', () => {
  const searchResult = {
    id: '11111111-2222-3333-4444-555555555555',
    title: 'Instant Add Track',
    releaseDate: '2020-01-01',
    length: 210000,
    artists: ['Test Artist'],
    albumName: 'Test Album',
    itemType: 'track',
    coverArt: 'https://coverartarchive.org/test-cover.jpg',
  }

  test('adds the item to the list without waiting for external links', async ({ page }) => {
    // Hold /api/links open for the whole first half of the test. If the add path
    // awaits link resolution before writing, the row never renders and this
    // fails on timeout — no wall-clock budget needed to catch the regression.
    let releaseLinks: () => void = () => {}
    const linksHeld = new Promise<void>((resolve) => {
      releaseLinks = resolve
    })
    let linksRequested = false

    await page.route('**/api/links*', async (route) => {
      linksRequested = true
      await linksHeld
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          externalLinks: [
            {
              platform: 'qobuz',
              label: 'Qobuz',
              url: 'https://www.qobuz.com/album/test',
              category: 'buy',
              source: 'platform-search',
            },
          ],
        }),
      })
    })

    await page.route('**/library/listen-later*', async (route) => {
      const url = new URL(route.request().url())
      if (!url.searchParams.has('type')) {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ serializedItems: [searchResult] }),
      })
    })

    await page.goto('/library/listen-later')
    await page.getByLabel('Song or album title', { exact: true }).fill('Instant Add')

    const result = page.getByRole('option', { name: 'Add Instant Add Track to listen later' })
    await expect(result).toBeVisible()
    await result.click()

    // The row must be in the saved list while the links request is still in flight.
    const itemRow = page.getByRole('row').filter({ hasText: 'Instant Add Track' })
    await expect(itemRow).toBeVisible()
    expect(linksRequested).toBe(true)

    // Releasing the links response must then patch the stored record in place.
    releaseLinks()
    await expect(itemRow.getByRole('link', { name: /Qobuz/ })).toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: 'Instant Add Track' })).toHaveCount(1)
  })
})

test.describe('cover art', () => {
  test.use({ serviceWorkers: 'block' })

  test('falls back to the placeholder when a release has no artwork', async ({ page }) => {
    // Release-group URLs are derived without asking the archive whether art
    // exists, so a 404 should finish with the placeholder rather than leave a
    // skeleton that looks stuck.
    await page.route('**/coverartarchive.org/**', (route) => route.fulfill({ status: 404 }))

    await page.route('**/library/listen-later*', async (route) => {
      const url = new URL(route.request().url())
      if (!url.searchParams.has('type')) {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          serializedItems: [
            {
              id: 'artless-release',
              title: 'Artless Release',
              releaseDate: '2020-01-01',
              artists: ['Nobody'],
              albumName: 'Nothing',
              itemType: 'track',
              coverArt: 'https://coverartarchive.org/release-group/artless-release/front-250',
            },
          ],
        }),
      })
    })

    await page.goto('/library/listen-later')
    await page.getByLabel('Song or album title', { exact: true }).fill('Artless')

    const cover = page.locator('#search-results-list img').first()
    await expect(cover).toHaveAttribute('src', '/blank-album.svg')
    // opacity-0 still counts as visible to Playwright, so assert the class that
    // actually proves the skeleton cleared rather than a toBeVisible() no-op.
    await expect(cover).toHaveClass(/opacity-100/)
  })

  test('shows a pulsing block for the cover while the search is in flight', async ({ page }) => {
    // The loading row used to render CoverArt with an empty src, which resolves
    // straight to the "Album Artwork Not Available" placeholder — a finished
    // looking image next to pulsing text bars.
    let releaseSearch = () => {}
    const searchHeld = new Promise<void>((resolve) => {
      releaseSearch = resolve
    })

    await page.route('**/library/listen-later*', async (route) => {
      const url = new URL(route.request().url())
      if (!url.searchParams.has('type')) {
        await route.continue()
        return
      }
      await searchHeld
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ serializedItems: [] }),
      })
    })

    await page.goto('/library/listen-later')
    await page.getByLabel('Song or album title', { exact: true }).fill('Held search')

    const loadingRow = page.locator('ul[role="listbox"] li')
    await expect(loadingRow).toBeVisible()
    await expect(loadingRow.locator('img')).toHaveCount(0)
    await expect(loadingRow.locator('div.animate-pulse.h-32.w-32')).toBeVisible()

    releaseSearch()
  })
})
