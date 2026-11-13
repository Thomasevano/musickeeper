import { test, expect, type Page } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'
import { DB_CONFIG } from '../../src/infrastructure/storage/listen_later_storage.js'
import { listenLaterSeed, seedListenLaterItems } from './fixtures.js'

const laterPath = '/qobuz/user-library/listen-later'
const discoverPath = '/qobuz/discover'
const stillOutstanding = 'Still Outstanding'
const closeToHome = 'Close to Home'

async function storedItems(page: Page) {
  return page.evaluate(async (config) => {
    const opening = Promise.withResolvers<IDBDatabase>()
    const request = indexedDB.open(config.name, config.version)
    request.onsuccess = () => opening.resolve(request.result)
    request.onerror = () => opening.reject(request.error)
    const database = await opening.promise
    try {
      const reading =
        Promise.withResolvers<Array<{ id: string; title: string; hasBeenListened: boolean }>>()
      const readRequest = database
        .transaction(config.storeName)
        .objectStore(config.storeName)
        .getAll()
      readRequest.onsuccess = () => reading.resolve(readRequest.result)
      readRequest.onerror = () => reading.reject(readRequest.error)
      return await reading.promise
    } finally {
      database.close()
    }
  }, DB_CONFIG)
}

async function checkAccessibility(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(result.violations).toEqual([])
}

test('opens the native library shell and keeps the new collection empty until an explicit save', async ({
  page,
}) => {
  await page.goto('/qobuz')
  await expect(page.getByRole('heading', { name: 'Bibliothèque', exact: true })).toBeVisible()
  const sections = [
    'all',
    'listen-later',
    'playlists',
    'tracks',
    'releases',
    'artists',
    'labels',
    'awards',
  ]
  for (const section of sections) {
    await expect(page.locator(`a[href="/qobuz/user-library/${section}"]`)).toBeVisible()
  }
  await page.locator(`a[href="${laterPath}"]`).click()
  await expect(page).toHaveURL(new RegExp(`${laterPath}$`))
  await expect.poll(() => storedItems(page).then((items) => items.length)).toBe(0)
  await expect(page.locator(`a[href="${discoverPath}"]`).last()).toBeVisible()
})

test('uses the observed Qobuz discovery catalog and local public visual assets, not account APIs', async ({
  page,
}) => {
  const accountRequests: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.hostname.endsWith('qobuz.com') && /\/api\/|\/user\//.test(url.pathname)) {
      accountRequests.push(url.origin + url.pathname)
    }
  })
  await page.goto(discoverPath)
  await expect(page.getByRole('heading', { name: 'Découvrir', exact: true })).toBeVisible()
  for (const title of [
    stillOutstanding,
    closeToHome,
    'trentemøller',
    '(SILHOUETTE)',
    'Drukqs (Expanded Edition)',
  ]) {
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible()
  }
  await page.evaluate(() => document.fonts.ready)
  const fonts = await page.evaluate(() => {
    const entries: Array<{ family: string; status: string }> = []
    document.fonts.forEach((font) => entries.push({ family: font.family, status: font.status }))
    return entries
  })
  expect(fonts.some((font) => font.family === 'Qobuz' && font.status === 'loaded')).toBe(true)
  const covers = page.locator('img[src^="/qobuz-concept/"]')
  await expect(covers.first()).toBeVisible()
  await expect
    .poll(() =>
      covers.evaluateAll((images) =>
        images.every(
          (image) =>
            (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0
        )
      )
    )
    .toBe(true)
  expect(accountRequests).toEqual([])
})

test('serves native PoC deep links on direct load and reload', async ({ page }) => {
  for (const path of [
    discoverPath,
    '/qobuz/user-library',
    laterPath,
    '/qobuz/album/nzxh5konmvw4j',
  ]) {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page.locator('a[href="/qobuz/user-library"]').last()).toBeVisible()
    await page.reload()
    await expect(page.locator('a[href="/qobuz/user-library"]').last()).toBeVisible()
    await expect(page.getByText('Not Found', { exact: true })).toHaveCount(0)
  }
})

test('shows existing MusicKeeper entries without reseeding, rewriting, or trusting their source URLs', async ({
  page,
}) => {
  await page.goto(laterPath)
  await seedListenLaterItems(page, [
    listenLaterSeed({
      id: 'existing-musickeeper-track',
      title: 'Titre MusicKeeper existant',
      itemType: 'track',
      externalLinks: [
        {
          platform: 'qobuz',
          label: 'Unsafe link',
          url: 'javascript:alert("must-not-run")',
          category: 'stream',
        },
      ],
      addedAt: new Date('2025-01-02T12:00:00.000Z').getTime(),
    }),
  ])
  await expect(page.getByText('Titre MusicKeeper existant', { exact: true })).toBeVisible()
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0)
  const items = await storedItems(page)
  expect(items.map((item) => item.id)).toEqual(['existing-musickeeper-track'])
  expect(items[0].hasBeenListened).toBe(false)
})

test('recovers from an asynchronously rejected database open by reloading', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('qobuz-simulated-open-failure')) {
      sessionStorage.setItem('qobuz-simulated-open-failure', 'true')
      window.indexedDB.open = () => {
        const request = {
          error: new DOMException('Simulated asynchronous open failure', 'UnknownError'),
        } as IDBOpenDBRequest
        queueMicrotask(() => request.onerror?.(new Event('error')))
        return request
      }
    }
  })
  await page.goto(laterPath)
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: /recharger/i }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect.poll(() => storedItems(page).then((items) => items.length)).toBe(0)
})

test('meets WCAG AA on native desktop library, discovery, collection and album screens', async ({
  page,
}) => {
  for (const path of ['/qobuz', discoverPath, laterPath, '/qobuz/album/nzxh5konmvw4j']) {
    await page.goto(path)
    await expect(page.locator('a[href="/qobuz/user-library"]').last()).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    await checkAccessibility(page)
  }
})

test('keeps the native navigation and collection usable on mobile without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  for (const path of ['/qobuz', discoverPath, laterPath, '/qobuz/album/nzxh5konmvw4j']) {
    await page.goto(path)
    await expect(page.locator('a[href="/qobuz/user-library"]').last()).toBeVisible()
    const dimensions = await page.evaluate(() => ({
      width: innerWidth,
      content: document.documentElement.scrollWidth,
    }))
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.width)
    await checkAccessibility(page)
  }
})

function albumCard(page: Page, title: string) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return page.getByRole('article', { name: new RegExp(`^${escaped} par `) })
}

async function saveAlbum(page: Page, title: string, waitForCompletion = true) {
  const card = albumCard(page, title)
  await card.hover()
  await card.getByRole('button', { name: `Plus d’options pour ${title}`, exact: true }).click()
  await page.getByRole('menuitem', { name: 'Ajouter à écouter plus tard', exact: true }).click()
  if (waitForCompletion) await expect(page.getByRole('status')).toContainText(title)
}

async function openListenLater(page: Page) {
  await page.getByRole('link', { name: 'Bibliothèque', exact: true }).click()
  await page.locator(`a[href="${laterPath}"]`).click()
}

test('saves from native menus, persists, searches, sorts, marks listened and removes only the selected item', async ({
  page,
}) => {
  await page.goto(discoverPath)
  await saveAlbum(page, stillOutstanding)
  await saveAlbum(page, closeToHome)
  await checkAccessibility(page)
  await openListenLater(page)
  await expect(albumCard(page, stillOutstanding)).toBeVisible()
  await expect(albumCard(page, closeToHome)).toBeVisible()
  await page.reload()
  const still = albumCard(page, stillOutstanding)
  const close = albumCard(page, closeToHome)
  await expect(still).toBeVisible()
  await still
    .getByRole('button', { name: `Marquer ${stillOutstanding} écouté`, exact: true })
    .click()
  const filters = page.locator('[aria-label="État d’écoute"]')
  await filters.getByRole('button', { name: 'Écouté', exact: true }).click()
  await expect(still).toBeVisible()
  await expect(close).toHaveCount(0)
  await filters.getByRole('button', { name: 'À écouter', exact: true }).click()
  await expect(close).toBeVisible()
  await expect(still).toHaveCount(0)
  await filters.getByRole('button', { name: 'Tout', exact: true }).click()
  const search = page.getByRole('searchbox', {
    name: 'Rechercher dans votre bibliothèque',
    exact: true,
  })
  await search.fill('Ragga')
  await expect(still).toBeVisible()
  await expect(close).toHaveCount(0)
  await search.clear()
  await page
    .getByRole('combobox', { name: 'Trier la bibliothèque', exact: true })
    .selectOption('title')
  await expect(page.getByRole('article').first()).toContainText(closeToHome)
  await page.getByRole('button', { name: 'Affichage en liste', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Affichage en liste', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await close
    .getByRole('button', { name: `Retirer ${closeToHome} de À écouter plus tard`, exact: true })
    .click()
  await expect(close).toHaveCount(0)
  await page.reload()
  const persisted = await storedItems(page)
  expect(persisted.map((item) => [item.title, item.hasBeenListened])).toEqual([
    [stillOutstanding, true],
  ])
})

test('shares saved records with the existing MusicKeeper library and prevents duplicate saves', async ({
  page,
}) => {
  await page.goto(discoverPath)
  await saveAlbum(page, stillOutstanding)
  const card = albumCard(page, stillOutstanding)
  await card.hover()
  await card
    .getByRole('button', { name: `Plus d’options pour ${stillOutstanding}`, exact: true })
    .click()
  await expect(
    page.getByRole('menuitem', { name: 'Ajouté à écouter plus tard', exact: true })
  ).toBeDisabled()
  expect(await storedItems(page)).toHaveLength(1)
  await page.goto('/library/listen-later')
  await expect(page.locator('[id="item-qobuz-concept:y9xwqjq7ru2vr"]')).toContainText(
    stillOutstanding
  )
})

test('supports native navigation and browser Back and Forward without losing the collection', async ({
  page,
}) => {
  await page.goto(discoverPath)
  await saveAlbum(page, stillOutstanding)
  await page.getByRole('link', { name: stillOutstanding, exact: true }).click()
  await expect(page).toHaveURL(/\/qobuz\/album\/y9xwqjq7ru2vr$/)
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Découvrir', exact: true })).toBeVisible()
  await page.goForward()
  await expect(page).toHaveURL(/\/qobuz\/album\/y9xwqjq7ru2vr$/)
  await page.locator('a[href="/qobuz/user-library"]').last().click()
  await page.locator(`a[href="${laterPath}"]`).click()
  await expect(albumCard(page, stillOutstanding)).toBeVisible()
})

test('updates the collection directly from committed writes without a post-write full-library read', async ({
  page,
}) => {
  await page.goto(discoverPath)
  await expect(albumCard(page, stillOutstanding)).toBeVisible()
  await page.evaluate(() => {
    IDBObjectStore.prototype.getAll = () => {
      throw new Error('Unexpected full-library read after a committed write')
    }
  })
  await saveAlbum(page, stillOutstanding)
  await openListenLater(page)
  const card = albumCard(page, stillOutstanding)
  await expect(card).toBeVisible()
  // Native links reload the document; instrument the new collection document too.
  await page.evaluate(() => {
    IDBObjectStore.prototype.getAll = () => {
      throw new Error('Unexpected full-library read after a committed write')
    }
  })
  await card
    .getByRole('button', { name: `Marquer ${stillOutstanding} écouté`, exact: true })
    .click()
  await expect(
    card.getByRole('button', { name: `Marquer ${stillOutstanding} à écouter`, exact: true })
  ).toBeVisible()
  await card
    .getByRole('button', {
      name: `Retirer ${stillOutstanding} de À écouter plus tard`,
      exact: true,
    })
    .click()
  await expect(card).toHaveCount(0)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.reload()
  expect(await storedItems(page)).toEqual([])
})

test('does not claim success or mutate the collection after a failed write and allows retry', async ({
  page,
}) => {
  await page.goto(discoverPath)
  await expect(albumCard(page, stillOutstanding)).toBeVisible()
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function () {
      IDBObjectStore.prototype.add = original
      throw new DOMException('Storage full', 'QuotaExceededError')
    }
  })
  await saveAlbum(page, stillOutstanding, false)
  await expect(page.getByRole('alert')).toBeVisible()
  expect(await storedItems(page)).toEqual([])
  await page.keyboard.press('Escape')
  await saveAlbum(page, stillOutstanding)
  await expect.poll(() => storedItems(page).then((items) => items.length)).toBe(1)
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('sorts native demonstration records together with saved items rather than leaving a fixed prefix', async ({
  page,
}) => {
  await page.goto('/qobuz/user-library')
  await page
    .getByRole('combobox', { name: 'Trier la bibliothèque', exact: true })
    .selectOption('title')
  await expect(page.getByRole('article').first()).toContainText('An Introduction to Qobuz')
})

test('keeps mobile action menus inside the viewport in discovery and list layouts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  for (const path of [discoverPath, '/qobuz/user-library']) {
    await page.goto(path)
    if (path !== discoverPath) {
      await page.getByRole('button', { name: 'Affichage en liste', exact: true }).click()
    }
    const trigger = page.getByRole('button', { name: /^Plus d’options pour / }).first()
    await trigger.click()
    const bounds = await page.getByRole('menu').boundingBox()
    expect(bounds).not.toBeNull()
    if (!bounds) throw new Error('The action menu has no rendered bounds')
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(375)
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  }
})

test('does not close another album menu when an earlier save finishes', async ({ page }) => {
  await page.goto(discoverPath)
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add
    IDBObjectStore.prototype.add = function (...args) {
      const request = original.apply(this, args)
      return new Proxy(request, {
        get(target, property) {
          return Reflect.get(target, property, target)
        },
        set(target, property, value) {
          if (property === 'onsuccess' && typeof value === 'function') {
            target.onsuccess = (event) => {
              window.setTimeout(() => value.call(target, event), 800)
            }
            return true
          }
          return Reflect.set(target, property, value, target)
        },
      })
    }
  })
  await saveAlbum(page, stillOutstanding, false)
  const other = albumCard(page, closeToHome)
  await other.hover()
  const trigger = other.getByRole('button', { name: `Plus d’options pour ${closeToHome}` })
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('status')).toContainText(stillOutstanding)
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('menu')).toBeVisible()
})

test('retains secondary-artist search matches when a native album is also saved for later', async ({
  page,
}) => {
  const title = 'Drukqs (Expanded Edition)'
  await page.goto('/qobuz/user-library')
  const search = page.getByRole('searchbox', {
    name: 'Rechercher dans votre bibliothèque',
    exact: true,
  })
  await search.fill('Richard D. James')
  await expect(albumCard(page, title)).toHaveCount(1)
  await search.fill('')
  await saveAlbum(page, title)
  for (const path of ['/qobuz/user-library', '/qobuz/user-library/releases']) {
    await page.goto(path)
    await page
      .getByRole('searchbox', { name: 'Rechercher dans votre bibliothèque', exact: true })
      .fill('Richard D. James')
    await expect(albumCard(page, title)).toHaveCount(1)
  }
})
