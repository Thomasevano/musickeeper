import { test, expect, type Page } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import { DB_CONFIG } from '../../src/infrastructure/storage/listen_later_storage.js'
import { listenLaterSeed, seedListenLaterItems } from './fixtures.js'

const laterPath = '/qobuz/user-library/listen-later'
const albumId = '11111111-1111-4111-8111-111111111111'
const trackId = '22222222-2222-4222-8222-222222222222'
const album = {
  id: albumId,
  title: 'A Quiet Place',
  artists: ['Aphex Twin'],
  releaseDate: '2024-01-01',
  itemType: 'album',
  sourceUrl: 'https://play.qobuz.com/not-a-real-search-result',
}
const track = {
  id: trackId,
  title: 'After the Rain',
  artists: ['Aphex Twin'],
  albumName: 'A Quiet Place',
  releaseDate: '2024-01-01',
  itemType: 'track',
  length: 125000,
}

type SearchRequest = { type: 'album' | 'track'; query: string; artist: boolean; at: number }
type SearchResponse = { status?: number; contentType?: string; body?: string; items?: unknown[] }

async function mockSearch(
  page: Page,
  respond?: (request: SearchRequest) => SearchResponse | Promise<SearchResponse>
) {
  const requests: SearchRequest[] = []
  await page.route('**/library/listen-later?**', async (route) => {
    const url = new URL(route.request().url())
    const type = url.searchParams.get('type')
    if (type !== 'album' && type !== 'track') return route.continue()
    const request: SearchRequest = {
      type,
      query: url.searchParams.get('q') || url.searchParams.get('artist') || '',
      artist: url.searchParams.has('artist'),
      at: Date.now(),
    }
    requests.push(request)
    const result = (await respond?.(request)) || {}
    try {
      await route.fulfill({
        status: result.status || 200,
        contentType: result.contentType || 'application/json',
        body:
          result.body ??
          JSON.stringify({ serializedItems: result.items || [type === 'album' ? album : track] }),
      })
    } catch (error) {
      if (!route.request().failure()) throw error
    }
  })
  return requests
}

async function readSaved(page: Page) {
  return page.evaluate(async (config) => {
    const opening = Promise.withResolvers<IDBDatabase>()
    const request = indexedDB.open(config.name, config.version)
    request.onsuccess = () => opening.resolve(request.result)
    request.onerror = () => opening.reject(request.error)
    const database = await opening.promise
    try {
      const reading =
        Promise.withResolvers<
          Array<{ id: string; title: string; itemType: string; sourceUrl?: string }>
        >()
      const get = database.transaction(config.storeName).objectStore(config.storeName).getAll()
      get.onsuccess = () => reading.resolve(get.result)
      get.onerror = () => reading.reject(get.error)
      return await reading.promise
    } finally {
      database.close()
    }
  }, DB_CONFIG)
}

async function search(page: Page, query = 'Aphex Twin') {
  await page.getByLabel('Recherche', { exact: true }).fill(query)
  await page.getByLabel('Recherche', { exact: true }).press('Enter')
  await expect(page).toHaveURL(/\/qobuz\/search\/all\?/)
}

function resultCard(page: Page, title: string) {
  return page.getByRole('article', { name: `${title} par Aphex Twin`, exact: true })
}

async function waitForSave(page: Page, title: string) {
  await expect(page.getByRole('status').filter({ hasText: `« ${title} » ajouté` })).toContainText(
    'À écouter plus tard'
  )
}

async function accessibility(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(result.violations).toEqual([])
}

test('uses the existing MusicBrainz endpoint and adds both native search result types to the shared list', async ({
  page,
}) => {
  const requests = await mockSearch(page)
  await page.goto(laterPath)
  await search(page)
  const card = resultCard(page, album.title)
  await expect(card).toBeVisible()
  await expect(resultCard(page, track.title)).toBeVisible()
  expect(requests.map((request) => request.type)).toEqual(['album', 'track'])
  expect(requests.every((request) => request.query === 'Aphex Twin' && !request.artist)).toBe(true)
  expect(requests[1].at - requests[0].at).toBeGreaterThanOrEqual(900)
  await card.hover()
  await card.getByRole('button', { name: `Plus d’options : ${album.title}` }).click()
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
  await expect(page.getByRole('menu')).toBeVisible()
  await page.getByRole('menuitem', { name: 'Ajouter à écouter plus tard', exact: true }).click()
  await waitForSave(page, album.title)
  await expect(
    card.getByRole('button', { name: `Écouter plus tard : ${album.title}` })
  ).toBeDisabled()
  await page.getByRole('link', { name: 'Voir tous les titres', exact: true }).click()
  await expect(page).toHaveURL(/\/qobuz\/search\/tracks\?/)
  await resultCard(page, track.title)
    .getByRole('button', { name: `Écouter plus tard : ${track.title}` })
    .click()
  await waitForSave(page, track.title)
  const saved = await readSaved(page)
  expect(saved.map((item) => item.id).sort()).toEqual([albumId, trackId])
  expect(saved.find((item) => item.id === albumId)?.sourceUrl).toBe(
    `https://musicbrainz.org/release/${albumId}`
  )
  expect(saved.find((item) => item.id === trackId)?.sourceUrl).toBe(
    `https://musicbrainz.org/recording/${trackId}`
  )
  await page.getByRole('link', { name: 'Fermer la recherche', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${laterPath}$`))
  await expect(page.getByRole('article')).toHaveCount(2)
  await page.getByLabel('Type de contenu', { exact: true }).selectOption('track')
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('article')).toContainText(track.title)
})

test('keeps native section positions stable while the subsequent track search is pending', async ({
  page,
}) => {
  const delayedTrack = Promise.withResolvers<void>()
  await mockSearch(page, async (request) => {
    if (request.type === 'track') await delayedTrack.promise
    return {}
  })
  try {
    await page.setViewportSize({ width: 1266, height: 880 })
    await page.goto('/qobuz/search/all?q=Aphex%20Twin')
    const card = resultCard(page, album.title)
    await expect(card).toBeVisible()
    await page.evaluate(() => document.fonts.ready.then(() => undefined))
    await expect(page.getByRole('status').filter({ hasText: 'Recherche en cours…' })).toHaveCount(1)
    const before = await card.evaluate((element) => element.getBoundingClientRect().top + scrollY)
    delayedTrack.resolve()
    await expect(resultCard(page, track.title)).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Recherche en cours…' })).toHaveCount(0)
    const after = await card.evaluate((element) => element.getBoundingClientRect().top + scrollY)
    expect(after).toBeCloseTo(before, 0)
    const heading = page.getByRole('heading', { name: 'Albums', exact: true })
    await expect(heading).toHaveCSS('font-size', '22px')
    await expect(heading).toHaveCSS('font-weight', '700')
  } finally {
    delayedTrack.resolve()
  }
})

test('intersects content type, listening status and local text search without changing stored items', async ({
  page,
}) => {
  await page.goto(laterPath)
  await seedListenLaterItems(page, [
    listenLaterSeed({
      id: albumId,
      title: album.title,
      artists: ['Aphex Twin'],
      itemType: 'album',
      hasBeenListened: true,
    }),
    listenLaterSeed({
      id: trackId,
      title: track.title,
      artists: ['Aphex Twin'],
      itemType: 'track',
    }),
    listenLaterSeed({
      id: 'local-playlist',
      title: 'Late Session',
      artists: ['Aphex Twin'],
      itemType: 'playlist',
    }),
  ])
  await page.goto(laterPath)
  await expect(page.getByRole('article')).toHaveCount(3)
  const type = page.getByLabel('Type de contenu', { exact: true })
  await type.selectOption('playlist')
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('article')).toContainText('Late Session')
  await expect(page).toHaveURL(/type=playlist/)
  await page.reload()
  await expect(type).toHaveValue('playlist')
  await expect(page.getByRole('article')).toHaveCount(1)
  const status = page.locator('[aria-label="État d’écoute"]')
  await status.getByRole('button', { name: 'Écouté', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(0)
  await status.getByRole('button', { name: 'Tout', exact: true }).click()
  await page.getByLabel('Rechercher dans votre bibliothèque', { exact: true }).fill('Quiet')
  await expect(page.getByRole('article')).toHaveCount(0)
  await type.selectOption('album')
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('article')).toContainText(album.title)
  expect(await readSaved(page)).toHaveLength(3)
})

test('can save the public native playlist locally and keeps its type in the normal MusicKeeper library', async ({
  page,
}) => {
  await page.goto('/qobuz/user-library/playlists')
  const add = page.getByRole('button', {
    name: 'Ajouter An Introduction to Qobuz à écouter plus tard',
    exact: true,
  })
  await expect(add).toBeEnabled()
  await add.click()
  await waitForSave(page, 'An Introduction to Qobuz')
  await expect(page.getByRole('article')).toHaveCount(1)
  await page.goto(`${laterPath}?type=playlist`)
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('article')).toContainText('Playlist')
  expect(await readSaved(page)).toMatchObject([
    { itemType: 'playlist', sourceUrl: 'https://play.qobuz.com/playlist/504746' },
  ])
  await page.goto('/library/listen-later')
  await expect(page.getByText('Playlist', { exact: true }).first()).toBeVisible()
})

test('aborts superseded searches and does not show or save a late result from the previous query', async ({
  page,
}) => {
  const oldResponse = Promise.withResolvers<void>()
  const requests = await mockSearch(page, async (request) => {
    if (request.query === 'First Query' && request.type === 'album') await oldResponse.promise
    return {
      items: [
        {
          ...(request.type === 'album' ? album : track),
          title: `${request.query} ${request.type}`,
        },
      ],
    }
  })
  await page.goto(laterPath)
  await search(page, 'First Query')
  await expect.poll(() => requests.some((request) => request.query === 'First Query')).toBe(true)
  await search(page, 'Second Query')
  await expect(resultCard(page, 'Second Query album')).toBeVisible()
  oldResponse.resolve()
  await expect(resultCard(page, 'Second Query track')).toBeVisible()
  await expect(page.getByText('First Query album', { exact: true })).toHaveCount(0)
  expect(await readSaved(page)).toHaveLength(0)
  await page.getByRole('button', { name: 'Effacer la recherche', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: '3 caractères' })).toBeVisible()
  const count = requests.length
  await page.getByLabel('Recherche', { exact: true }).fill('ab')
  await page.getByLabel('Recherche', { exact: true }).press('Enter')
  await expect(page.getByRole('status').filter({ hasText: '3 caractères' })).toBeVisible()
  expect(requests).toHaveLength(count)
})

test('retains successful albums on a track failure and retries only the failed category', async ({
  page,
}) => {
  let fail = true
  const requests = await mockSearch(page, (request) =>
    request.type === 'track' && fail
      ? { status: 503, body: 'Unavailable', contentType: 'text/plain' }
      : {}
  )
  await page.goto('/qobuz/search/all?q=Aphex+Twin')
  await expect(page.getByRole('alert')).toContainText('Titres')
  await expect(resultCard(page, album.title)).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(resultCard(page, track.title)).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(requests.filter((request) => request.type === 'album')).toHaveLength(1)
  expect(requests.filter((request) => request.type === 'track')).toHaveLength(2)
})

test('handles non-JSON search failure and honest empty and unavailable playlist states', async ({
  page,
}) => {
  let broken = true
  const requests = await mockSearch(page, () =>
    broken ? { body: '<html>Upstream failure</html>', contentType: 'text/html' } : { items: [] }
  )
  await page.goto('/qobuz/search/albums?q=Unknown')
  await expect(page.getByRole('alert')).toContainText('Réponse non JSON')
  broken = false
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Aucun résultat' })).toBeVisible()
  const count = requests.length
  await page.goto('/qobuz/search/playlists?q=Aphex+Twin')
  await expect(
    page.getByText(/MusicBrainz.*playlists|playlists.*MusicBrainz/).first()
  ).toBeVisible()
  expect(requests).toHaveLength(count)
})

test('uses the supported artist-only backend scope and preserves it across native category navigation', async ({
  page,
}) => {
  const requests = await mockSearch(page)
  await page.goto('/qobuz/search/all?q=Aphex+Twin')
  await expect(resultCard(page, track.title)).toBeVisible()
  await page.getByRole('checkbox', { name: 'Artiste Principal', exact: true }).check()
  await expect(page).toHaveURL(/field=artist/)
  await expect.poll(() => requests.filter((request) => request.artist).length).toBe(2)
  await page.getByRole('link', { name: 'Voir tous les albums', exact: true }).click()
  await expect(page).toHaveURL(/\/qobuz\/search\/albums\?.*field=artist/)
  await expect(resultCard(page, album.title)).toBeVisible()
  expect(requests.at(-1)?.artist).toBe(true)
})

test('keeps the new search and content filter accessible on desktop and narrow screens', async ({
  page,
}) => {
  await mockSearch(page)
  await page.goto('/qobuz/search/all?q=Aphex+Twin&from=https%3A%2F%2Fevil.example')
  await expect(resultCard(page, track.title)).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Fermer la recherche', exact: true })
  ).toHaveAttribute('href', '/qobuz/discover')
  await accessibility(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true)
  expect(
    await page
      .getByLabel('Recherche', { exact: true })
      .evaluate((input) => Number.parseFloat(getComputedStyle(input).fontSize))
  ).toBeGreaterThanOrEqual(16)
  expect(
    await page
      .getByLabel('Recherche', { exact: true })
      .evaluate((input) => input.getBoundingClientRect().width)
  ).toBeGreaterThanOrEqual(120)
  const card = resultCard(page, album.title)
  await card.hover()
  const trigger = card.getByRole('button', { name: `Plus d’options : ${album.title}` })
  await trigger.click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  const box = await menu.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  await accessibility(page)
  await menu.press('End')
  await expect(
    page.getByRole('menuitem', { name: 'Voir sur MusicBrainz', exact: true })
  ).toBeFocused()
  await menu.press('Escape')
  await expect(trigger).toBeFocused()
  await trigger.click()
  await expect(menu).toBeVisible()
  await page.evaluate(() => window.scrollBy(0, scrollY > 0 ? -40 : 40))
  await expect(menu).toBeHidden()
  await page.goto(laterPath)
  await expect(page.getByLabel('Type de contenu', { exact: true })).toBeVisible()
  await accessibility(page)
})
