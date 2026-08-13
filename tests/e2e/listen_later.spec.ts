import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import {
  SPOTIFY_URL,
  heldRoute,
  listenLaterSeed,
  mockMetadataResponse,
  resultOptions,
  seedListenLaterItems,
  settleAnimations,
} from './fixtures.js'

// The "Add" link button shares its accessible-name prefix with the sortable
// "Added" column header, so it must be matched exactly.
const addLinkButton = (page: Page) => page.getByRole('button', { name: 'Add', exact: true })

// The search combobox is labelled "Song or album title", which contains both
// "Title" and "Album" as substrings, and the item-type trigger is named after
// the type it holds - "Album" once an album is selected. Scope editable-field
// lookups to the text boxes inside the dialog.
const dialogField = (page: Page, label: string) =>
  page.getByRole('dialog').getByRole('textbox', { name: label, exact: true })

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
    await expect(
      page.getByText('"Never Gonna Give You Up" by Rick Astley added to your list')
    ).toBeVisible()
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
    // The exact match keeps this on the visible copy: the live region that
    // announces the same resolution prefixes it with "Duplicate found."
    await expect(
      page.getByText('An item with the same title and the same artists is already in your list.', {
        exact: true,
      })
    ).toBeVisible()

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

  for (const { layout, viewport, expectedId } of [
    {
      layout: 'desktop row',
      viewport: { width: 1280, height: 800 },
      expectedId: `item-${mockMetadataResponse.musicItem.id}`,
    },
    {
      layout: 'mobile card',
      viewport: { width: 320, height: 568 },
      expectedId: `mobile-item-${mockMetadataResponse.musicItem.id}`,
    },
  ]) {
    test(`view existing scrolls to and highlights the visible ${layout}`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
      await addLinkButton(page).click()
      await page.evaluate(() => {
        const scrollIntoView = Element.prototype.scrollIntoView
        const targets: string[] = []
        Object.assign(window, { __scrollTargets: targets })
        Element.prototype.scrollIntoView = function (
          this: Element,
          options?: boolean | ScrollIntoViewOptions
        ) {
          if (this.id.startsWith('item-') || this.id.startsWith('mobile-item-')) {
            targets.push(this.id)
          }
          return scrollIntoView.call(this, options)
        }
      })

      const visibleItem = page.locator(`#${expectedId}`)
      await page.getByRole('button', { name: 'View Existing' }).dispatchEvent('click')
      await expect(visibleItem).toHaveClass(/bg-warning\/20/)
      await expect(page.getByRole('dialog')).not.toBeVisible()
      await expect(visibleItem).toBeVisible()
      await expect
        .poll(() =>
          page.evaluate(() => {
            const instrumented = window as unknown as InstrumentedWindow
            return instrumented.__scrollTargets
          })
        )
        .toEqual([expectedId])
    })
  }
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
    await expect(
      page.getByText('"Together Forever" by Rick Astley, Someone Else added to your list')
    ).toBeVisible()
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
    await page.getByRole('menuitem', { name: /^Delete/ }).click()

    // Confirm deletion in the confirmation dialog
    await expect(page.getByRole('heading', { name: 'Are you sure?' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirm' }).click()

    // Item is removed from the list
    await expect(itemRow).not.toBeVisible()

    // Empty state message appears
    await expect(page.getByText('Add your first item by searching above')).toBeVisible()

    // Success toast appears
    await expect(
      page.getByText('"Never Gonna Give You Up" by Rick Astley removed from your list')
    ).toBeVisible()
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

    // One result, and clicking it toggles: the option is named by the lines it
    // prints, so both states answer to the same name.
    const searchResult = resultOptions(page)
    await searchResult.click()

    await expect(
      page.getByText('"Never Gonna Give You Up" by Rick Astley added to your list')
    ).toBeVisible()

    const itemRow = page.getByRole('row').filter({ hasText: 'Never Gonna Give You Up' })
    await expect(itemRow).toBeVisible()

    await searchResult.click()

    await expect(
      page.getByText('"Never Gonna Give You Up" by Rick Astley removed from your list')
    ).toBeVisible()
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

    await page.getByRole('combobox', { name: 'Type', exact: true }).selectOption('album')
    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('not_listened')

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
    await expect(page.getByRole('combobox', { name: 'Sort', exact: true })).toHaveValue(
      'artists_asc'
    )
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
    const mobileSort = page.getByRole('combobox', { name: 'Sort', exact: true })
    await expect(mobileSort).toHaveValue('artists_desc')
    await mobileSort.selectOption('added_asc')
    await expect(mobileSort).toHaveValue('added_asc')

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.getByRole('button', { name: 'Title, not sorted', exact: true }).click()
    await page.setViewportSize({ width: 320, height: 568 })
    // No phone option produces this order, so the select names it and refuses it.
    await expect(mobileSort).toHaveValue('custom')
    const custom = mobileSort.getByRole('option', { name: 'Title (ascending)' })
    await expect(custom).toHaveAttribute('disabled', '')
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

interface MotionReport {
  observed: string[]
  moving: string[]
}

/** The globals the init scripts below hang off `window` to report back through. */
interface InstrumentedWindow {
  __motion: MotionReport
  __scrolls: string[]
  __scrollTargets: string[]
}

/**
 * Records animations as they start rather than sampling `getAnimations()`: a
 * 150ms transition is over before a round trip can observe it. Patching
 * `Element.animate` catches Svelte's transitions, `animationstart` catches the
 * CSS keyframe animations, and `transitionstart` catches transformed
 * transitions, which fire no animation event at all.
 */
async function recordMotion(page: Page) {
  await page.addInitScript(() => {
    // tailwindcss-animate writes its keyframes as `translate3d(var(--tw-enter-
    // translate-x), ...) scale3d(...) rotate(...)`, so a motionless enter still
    // reads as a long transform string. Resolve it instead of matching text.
    const stillsInPlace = (transform: string) => {
      if (transform === '' || transform === 'none') return true
      try {
        return new DOMMatrix(transform).isIdentity
      } catch {
        return false
      }
    }
    const report: MotionReport = { observed: [], moving: [] }
    Object.assign(window, { __motion: report })

    const name = (element: Element) => {
      const tag = element.tagName.toLowerCase()
      // SVG elements carry an `SVGAnimatedString` here, not a string.
      const classes = typeof element.className === 'string' ? element.className : ''
      const first = classes.split(' ')[0]
      return first ? `${tag}.${first}` : tag
    }

    const record = (animation: Animation, element: Element) => {
      if (!(animation.effect instanceof KeyframeEffect)) return
      report.observed.push(name(element))
      for (const frame of animation.effect.getKeyframes()) {
        const transform = String(frame.transform ?? 'none')
        if (!stillsInPlace(transform)) report.moving.push(`${name(element)} -> ${transform}`)
      }
    }

    document.addEventListener(
      'animationstart',
      (event) => {
        const element = event.target
        if (!(element instanceof Element)) return
        for (const animation of element.getAnimations()) record(animation, element)
      },
      true
    )

    document.addEventListener(
      'transitionstart',
      (event) => {
        const element = event.target
        if (!(element instanceof Element)) return
        if (event.propertyName.includes('transform')) {
          report.moving.push(`${name(element)} -> transition:${event.propertyName}`)
        }
      },
      true
    )

    const animate = Element.prototype.animate
    Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) {
      const animation = animate.apply(this, args)
      record(animation, this)
      return animation
    }
  })
}

/**
 * Reads the recording once the surfaces have both started and finished moving.
 * Playwright calls a dialog visible on the frame it mounts, which is before
 * `animationstart` fires, so an unguarded read can catch an empty recording and
 * pass while a transform is still queued.
 */
async function settledMotionReport(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          // Hung off `window` by recordMotion's init script, which runs first.
          const instrumented = window as unknown as InstrumentedWindow
          return instrumented.__motion.observed.length
        }),
      { message: 'no animation ran at all, so the recording proves nothing' }
    )
    .toBeGreaterThan(0)
  await settleAnimations(page)
  return page.evaluate(() => {
    const instrumented = window as unknown as InstrumentedWindow
    return instrumented.__motion
  })
}

test.describe('reduced motion', () => {
  test('no surface travels once the OS asks for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await recordMotion(page)
    const answerMetadata = await heldRoute(page, (url) => url.pathname === '/api/link/metadata')
    await page.goto('/library/listen-later')
    // Two rows: deleting the only one empties the list and tears the table
    // down, and Svelte skips a local `out:` when its parent block goes with it.
    await seedListenLaterItems(page, [
      listenLaterSeed({ id: 'reduced-motion-item', title: 'Discovery' }),
      listenLaterSeed({ id: 'reduced-motion-survivor', title: 'Homework' }),
    ])

    // The add dialog scales in at rest, and holds a spinning loader while the
    // metadata request is in flight.
    await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
    await addLinkButton(page).click()
    await expect(page.getByText('Loading metadata...')).toBeVisible()
    // A full turn starts and ends on an identity matrix, so the transform
    // recorder below is blind to it. Assert the swap where it happens.
    await expect(page.locator('.animate-spin')).toHaveCSS('animation-name', 'pulse')
    answerMetadata({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMetadataResponse),
    })
    await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // The row menu zooms and slides in; the status badge spins its icon.
    const row = page.getByRole('row').filter({ hasText: 'Discovery' })
    await row.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('menuitem', { name: /as listened$/ }).click()
    await expect(row.getByText('Listened', { exact: true })).toBeVisible()

    // The delete confirmation is a second dialog on top of the first surface.
    // Confirming it takes the row out and raises a toast - the two newest
    // moving surfaces in the app.
    await row.getByRole('button', { name: 'Open menu' }).click()
    await page.getByRole('menuitem', { name: /^Delete/ }).click()
    await expect(page.getByRole('heading', { name: 'Are you sure?' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page.getByText('"Discovery" by Artist removed from your list')).toBeVisible()
    await expect(row).toHaveCount(0)

    const { moving } = await settledMotionReport(page)
    expect(moving).toEqual([])
  })

  test('the navigation sheet fades instead of sliding', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await recordMotion(page)
    await page.goto('/')
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const { moving } = await settledMotionReport(page)
    expect(moving).toEqual([])
  })

  test('the highlight scroll jumps instead of gliding', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(() => {
      const scrollIntoView = Element.prototype.scrollIntoView
      const behaviours: string[] = []
      Object.assign(window, { __scrolls: behaviours })
      Element.prototype.scrollIntoView = function (
        this: Element,
        options?: boolean | ScrollIntoViewOptions
      ) {
        behaviours.push(typeof options === 'object' ? String(options.behavior) : 'auto')
        return scrollIntoView.call(this, options)
      }
    })
    await page.route('**/api/link/metadata', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMetadataResponse),
      })
    )
    await page.goto('/library/listen-later')
    await addSpotifyItem(page)

    // Re-pasting the same link reports a duplicate, and "View Existing" is the
    // only path that scrolls the list on the user's behalf.
    await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
    await addLinkButton(page).click()
    await expect(page.getByRole('heading', { name: 'Duplicate Found' })).toBeVisible()
    await page.getByRole('button', { name: 'View Existing' }).click()

    await expect
      .poll(() =>
        page.evaluate(() => {
          // Hung off `window` by the scrollIntoView patch installed above.
          const instrumented = window as unknown as InstrumentedWindow
          return instrumented.__scrolls
        })
      )
      .toEqual(['auto'])
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
      page.getByRole('combobox', { name: 'Status', exact: true }),
      page.getByRole('combobox', { name: 'Type', exact: true }),
      page.getByRole('combobox', { name: 'Sort', exact: true }),
      mobileCard.getByRole('button', { name: 'Open menu' }),
      mobileCard.getByRole('link', { name: 'Deezer' }),
      page.getByRole('button', { name: 'Previous' }),
      page.getByRole('button', { name: 'Next' }),
      page.getByRole('button', { name: 'Open navigation' }),
      page.getByRole('link', { name: 'MusicKeeper home', exact: true }),
    ]

    for (const control of controls) await expectMinTouchTarget(control)

    // The options themselves are the platform's picker - it is drawn outside the
    // page and is not ours to size. Only the control that opens it is.

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

    const status = page.getByRole('combobox', { name: 'Status', exact: true })
    const type = page.getByRole('combobox', { name: 'Type', exact: true })

    // A visible label now sits beside each control, so the row is the filter:
    // the desktop's 190px cap escaping to the phone would shrink it, not them.
    for (const filter of [status, type]) {
      await expect(filter).toBeVisible()
      const row = page.locator('label').filter({ has: filter })
      await expect
        .poll(() => row.evaluate((element) => element.clientWidth))
        .toBeGreaterThanOrEqual(250)
    }

    const listenedTrack = page.locator('#mobile-item-filter-listened-track')
    const unlistenedAlbum = page.locator('#mobile-item-filter-unlistened-album')

    await status.selectOption('listened')
    await expect(listenedTrack).toBeVisible()
    await expect(unlistenedAlbum).not.toBeVisible()

    await status.selectOption('all')
    await type.selectOption('album')
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
    await page.getByRole('menuitem', { name: /as listened$/ }).click()
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
    await page.getByRole('menuitem', { name: /^Delete/ }).click()
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

    const sort = page.getByRole('combobox', { name: 'Sort', exact: true })

    await sort.selectOption('artists_asc')
    await expect
      .poll(() => mobileItems.evaluateAll((items) => items.map((item) => item.id)))
      .toEqual(['mobile-item-new-apple', 'mobile-item-middle-mango', 'mobile-item-old-zebra'])

    await sort.selectOption('added_desc')
    await expect
      .poll(() => mobileItems.evaluateAll((items) => items.map((item) => item.id)))
      .toEqual(['mobile-item-middle-mango', 'mobile-item-old-zebra', 'mobile-item-new-apple'])

    await sort.selectOption('added_asc')
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

    const result = page.getByRole('option', { name: /Title: Instant Add Track/ })
    await expect(result).toBeVisible()
    await result.click()

    // The row must be in the saved list while the links request is still in flight.
    const itemRow = page.getByRole('row').filter({ hasText: 'Instant Add Track' })
    await expect(itemRow).toBeVisible()
    expect(linksRequested).toBe(true)
    await expect(itemRow.getByText('Fetching links…')).toBeVisible()
    const linkStatus = page.getByRole('status').filter({ hasText: 'Fetching links…' })
    await expect(linkStatus).toHaveCount(1)

    // Releasing the links response must then patch the stored record in place.
    releaseLinks()
    await expect(itemRow.getByRole('link', { name: /Qobuz/ })).toBeVisible()
    await expect(itemRow.getByText('Fetching links…')).toBeHidden()
    await expect(linkStatus).toHaveCount(0)
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
