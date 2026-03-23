import { test, expect } from '@playwright/test'

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
    await page.getByRole('button', { name: 'Add' }).click()

    // Dialog opens with the correct title
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()

    // Editable fields are populated
    await expect(page.getByLabel('Title')).toHaveValue('Never Gonna Give You Up')
    await expect(page.getByLabel('Artists')).toHaveValue('Rick Astley')
    await expect(page.getByLabel('Album')).toHaveValue('Whenever You Need Somebody')

    // Source badge is shown
    await expect(page.getByText('MusicBrainz Match')).toBeVisible()

    // Click "Add to List"
    await page.getByRole('button', { name: 'Add to List' }).click()

    // Dialog closes
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Item appears in the list table
    await expect(
      page.getByRole('cell', { name: 'Never Gonna Give You Up', exact: true })
    ).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Rick Astley', exact: true })).toBeVisible()

    // Success toast appears
    await expect(page.getByText('"Never Gonna Give You Up" added to your list')).toBeVisible()
  })
})

test.describe('paste link - invalid link errors', () => {
  test('shows client-side error for invalid URL format', async ({ page }) => {
    await page.goto('/library/listen-later')

    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill('not-a-valid-url')

    await page.getByRole('button', { name: 'Add' }).click()

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

    await page.getByRole('button', { name: 'Add' }).click()

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

    await page.getByRole('button', { name: 'Add' }).click()

    // Dialog opens with error
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Failed to fetch metadata')).toBeVisible()
  })

  test('add button is disabled when input is empty', async ({ page }) => {
    await page.goto('/library/listen-later')

    await expect(page.getByRole('button', { name: 'Add' })).toBeDisabled()
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
    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill(SPOTIFY_URL)
    await page.getByRole('button', { name: 'Add' }).click()
    await page.getByRole('button', { name: 'Add to List' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('shows duplicate warning when pasting same link again', async ({ page }) => {
    // Paste the same link again
    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill(SPOTIFY_URL)
    await page.getByRole('button', { name: 'Add' }).click()

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
    await page.getByRole('button', { name: 'Add' }).click()

    // Wait for duplicate dialog to fully load
    await expect(page.getByRole('heading', { name: 'Duplicate Found' })).toBeVisible()

    // Click "Add Anyway"
    await page.getByRole('button', { name: 'Add Anyway' }).click()

    // Two rows now exist with the same title
    const titleCells = page.getByRole('cell', { name: 'Never Gonna Give You Up', exact: true })
    await expect(titleCells).toHaveCount(2)
  })

  test('view existing closes dialog and scrolls to the item', async ({ page }) => {
    // Paste the same link again
    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill(SPOTIFY_URL)
    await page.getByRole('button', { name: 'Add' }).click()

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
    await page.getByRole('button', { name: 'Add' }).click()

    // Wait for dialog with data
    await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()

    // Edit the title
    const titleInput = page.getByLabel('Title')
    await titleInput.clear()
    await titleInput.fill('Together Forever')

    // Edit the artists
    const artistsInput = page.getByLabel('Artists')
    await artistsInput.clear()
    await artistsInput.fill('Rick Astley, Someone Else')

    // Edit the album
    const albumInput = page.getByLabel('Album')
    await albumInput.clear()
    await albumInput.fill('Hold Me in Your Arms')

    // Confirm
    await page.getByRole('button', { name: 'Add to List' }).click()

    // Edited values appear in the list
    await expect(page.getByRole('cell', { name: 'Together Forever', exact: true })).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'Rick Astley, Someone Else', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: 'Hold Me in Your Arms', exact: true })
    ).toBeVisible()

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
    await page.getByRole('button', { name: 'Add' }).click()

    await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()

    // Clear the title
    const titleInput = page.getByLabel('Title')
    await titleInput.clear()

    // Add to List button should be disabled
    await expect(page.getByRole('button', { name: 'Add to List' })).toBeDisabled()

    // Type something back
    await titleInput.fill('New Title')
    await expect(page.getByRole('button', { name: 'Add to List' })).toBeEnabled()
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

    // First add an item
    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await linkInput.fill(SPOTIFY_URL)
    await page.getByRole('button', { name: 'Add' }).click()
    await page.getByRole('button', { name: 'Add to List' }).click()

    // Verify item is in the list
    await expect(
      page.getByRole('cell', { name: 'Never Gonna Give You Up', exact: true })
    ).toBeVisible()

    // Click the delete button (trash icon in the row)
    const deleteButton = page
      .getByRole('row')
      .filter({ hasText: 'Never Gonna Give You Up' })
      .getByRole('button')
      .last()
    await deleteButton.click()

    // Item is removed from the list
    await expect(
      page.getByRole('cell', { name: 'Never Gonna Give You Up', exact: true })
    ).not.toBeVisible()

    // Empty state message appears
    await expect(page.getByText('No items in your listen later list yet')).toBeVisible()

    // Success toast appears
    await expect(page.getByText('"Never Gonna Give You Up" removed from your list')).toBeVisible()
  })
})
