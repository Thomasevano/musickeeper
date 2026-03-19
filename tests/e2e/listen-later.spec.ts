import { test, expect } from '@playwright/test'

const SPOTIFY_URL = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'

const mockMetadataResponse = {
  musicItem: {
    id: 'test-123',
    title: 'Never Gonna Give You Up',
    artists: ['Rick Astley'],
    albumName: 'Whenever You Need Somebody',
    coverArt: 'https://i.scdn.co/image/abc123',
    itemType: 'track',
    releaseDate: '1987-07-27',
  },
  source: 'musicbrainz',
  linkMetadata: {
    title: 'Never Gonna Give You Up',
    artist: 'Rick Astley',
    type: 'track',
    thumbnailUrl: 'https://i.scdn.co/image/abc123',
    originalUrl: SPOTIFY_URL,
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
