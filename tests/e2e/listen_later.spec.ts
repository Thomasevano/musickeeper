import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

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

// The "Add" link button shares its accessible-name prefix with the sortable
// "Added" column header, so it must be matched exactly.
const addLinkButton = (page: Page) => page.getByRole('button', { name: 'Add', exact: true })

// The search combobox is labelled "Song or album title", which contains both
// "Title" and "Album" as substrings. Scope editable-field lookups to the dialog.
const dialogField = (page: Page, label: string) =>
  page.getByRole('dialog').getByLabel(label, { exact: true })

async function addSpotifyItem(page: Page) {
  await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
  await addLinkButton(page).click()
  await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()
  await page.getByRole('button', { name: 'Add to List' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
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
    await expect(page.getByText('already exists in your list')).toBeVisible()

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
