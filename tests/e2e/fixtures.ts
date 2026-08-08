import type { Page } from '@playwright/test'
import { DB_CONFIG } from '../../src/infrastructure/storage/listen_later_storage.js'

export const SPOTIFY_URL = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'

// The filters are native `<select>`s, whose `<option>`s carry the same role as
// a search result. Only the results hang off a `listbox`; a select is a
// `combobox`, so naming the owner is what separates them.
export const resultOptions = (page: Page) => page.getByRole('listbox').getByRole('option')

export const mockMetadataResponse = {
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

export interface ListenLaterItemSeed {
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

export function listenLaterSeed(overrides: ListenLaterSeedOverrides): ListenLaterItemSeed {
  return {
    artists: ['Artist'],
    itemType: 'album',
    hasBeenListened: false,
    addedAt: 1,
    ...overrides,
  }
}

export async function mockMetadataRoute(page: Page) {
  await page.route('**/api/link/metadata', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMetadataResponse),
    })
  )
}

/**
 * Answers the search request the combobox fires, with results built on top of
 * `mockMetadataResponse.musicItem` so only what a test cares about is spelled out.
 */
export async function searchResultsRoute(
  page: Page,
  items: Array<Partial<(typeof mockMetadataResponse)['musicItem']> & { id: string }>
) {
  await page.route(
    (url) => url.pathname === '/library/listen-later' && url.searchParams.has('type'),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          serializedItems: items.map((item) => ({ ...mockMetadataResponse.musicItem, ...item })),
        }),
      })
  )
}

export async function seedListenLaterItems(page: Page, items: ListenLaterItemSeed[]) {
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

/**
 * Leaves the database one version ahead of the app, the way a downgrade would,
 * so the next load of the list fails with a VersionError. Raising the version
 * needs every other connection closed, so the bump runs from the home page —
 * it never opens the store — and the caller lands on the list afterwards.
 */
export async function failNextListLoad(page: Page) {
  await page.goto('/')
  await page.evaluate(async (config) => {
    const opening = Promise.withResolvers<void>()
    const request = indexedDB.open(config.name, config.version + 1)
    request.onsuccess = () => {
      request.result.close()
      opening.resolve()
    }
    request.onerror = () => opening.reject(request.error)
    await opening.promise
  }, DB_CONFIG)
  await page.goto('/library/listen-later')
}

/**
 * Resolves once every finite animation has finished. Anything measured while a
 * surface is still moving — a contrast ratio, a recorded transform — describes
 * a frame that lasts 200ms rather than the state the user is left with.
 * Infinite animations, the skeleton pulse, are excluded: they never settle.
 */
export const settleAnimations = (page: Page) =>
  page.waitForFunction(() =>
    document
      .getAnimations()
      .filter(
        (animation) => animation.effect?.getComputedTiming().iterations !== Number.POSITIVE_INFINITY
      )
      .every((animation) => animation.playState === 'finished')
  )

type StubResponse = { status: number; contentType: string; body: string }

/**
 * Registers a route that stays pending until the returned function answers it,
 * so the loading state it holds the page in can be observed before the response
 * lands and replaces it.
 */
export async function heldRoute(page: Page, matches: (url: URL) => boolean) {
  let answer: (response: StubResponse) => void = () => {}
  const answered = new Promise<StubResponse>((resolve) => {
    answer = resolve
  })

  await page.route(matches, async (route) => route.fulfill(await answered))

  return (response: StubResponse) => answer(response)
}
