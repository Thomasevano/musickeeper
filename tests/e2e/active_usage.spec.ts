import { test, expect, type Page } from '@playwright/test'
import { mockMetadataRoute, SPOTIFY_URL, searchResultsRoute, resultOptions } from './fixtures.js'

const productionOrigin = 'https://musickeeper.app'
const listPath = '/library/listen-later'

test.use({ serviceWorkers: 'block' })

// Serve the app at its production origin without reaching the live app or collector.
async function productionPage(page: Page, baseURL: string) {
  await page.route(`${productionOrigin}/**`, async (route) => {
    const url = new URL(route.request().url())
    const response = await route.fetch({ url: new URL(url.pathname + url.search, baseURL).href })
    await route.fulfill({ response })
  })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { configurable: true, get: () => false })
  })
}

async function captureActivity(page: Page) {
  const events: unknown[] = []
  await page.exposeFunction('captureActivity', (name: string, options: unknown) => {
    events.push({ name, options })
  })
  await page.addInitScript(() => {
    Object.assign(window, {
      plausible: (name: string, options: unknown) => {
        void Reflect.get(window, 'captureActivity')(name, options)
      },
    })
  })
  // Even against a production build, the test SDK replaces the external boundary.
  await page.route('https://analytics.thomasevano.fr/**', (route) => route.abort())
  return events
}

async function addItem(page: Page) {
  await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()
  await page.getByRole('button', { name: 'Add to List' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Never Gonna Give You Up' })).toBeVisible()
}

test('successful save qualifies once; reading and a rejected duplicate do not', async ({
  page,
  baseURL,
}) => {
  await productionPage(page, baseURL!)
  const events = await captureActivity(page)
  await mockMetadataRoute(page)
  await page.route('**/api/links?*', (route) => route.fulfill({ json: { externalLinks: [] } }))
  await page.goto(productionOrigin + listPath)
  await expect(page.getByRole('heading', { name: 'Listen Later', exact: true })).toBeVisible()
  expect(events).toEqual([])
  await addItem(page)
  await expect
    .poll(() => events)
    .toEqual([{ name: 'active_use', options: { props: { action: 'item_saved' } } }])
  await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Duplicate Found' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(events).toEqual([{ name: 'active_use', options: { props: { action: 'item_saved' } } }])
})

test('list actions report status changes, external clicks, and confirmed removal only', async ({
  page,
  baseURL,
}) => {
  await productionPage(page, baseURL!)
  const events = await captureActivity(page)
  await mockMetadataRoute(page)
  await page.route('**/api/links?*', (route) =>
    route.fulfill({
      json: {
        externalLinks: [
          { platform: 'spotify', label: 'Spotify', url: SPOTIFY_URL, category: 'stream' },
        ],
      },
    })
  )
  await page
    .context()
    .route('https://open.spotify.com/**', (route) => route.fulfill({ body: 'Music service' }))
  await page.goto(productionOrigin + listPath)
  await addItem(page)
  const row = page.getByRole('row').filter({ hasText: 'Never Gonna Give You Up' })
  await row.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('menuitem', { name: /as listened$/ }).click()
  await expect(row).toContainText('Listened')
  await expect
    .poll(() => events)
    .toEqual([
      { name: 'active_use', options: { props: { action: 'item_saved' } } },
      { name: 'active_use', options: { props: { action: 'marked_listened' } } },
    ])
  await row.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('menuitem', { name: /as not listened$/ }).click()
  await expect(row).toContainText('Not listened')
  const popup = page.waitForEvent('popup')
  await row.getByRole('link', { name: 'Spotify', exact: true }).press('Enter')
  const musicPage = await popup
  await musicPage.close()
  await row.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('menuitem', { name: /^Delete/ }).click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect
    .poll(() => events)
    .toEqual([
      { name: 'active_use', options: { props: { action: 'item_saved' } } },
      { name: 'active_use', options: { props: { action: 'marked_listened' } } },
      { name: 'active_use', options: { props: { action: 'marked_unlistened' } } },
      { name: 'active_use', options: { props: { action: 'open_external_link' } } },
    ])
  await row.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('menuitem', { name: /^Delete/ }).click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(row).not.toBeVisible()
  await expect
    .poll(() => events.at(-1))
    .toEqual({ name: 'active_use', options: { props: { action: 'item_removed' } } })
})

test('search result add and remove both qualify without counting link backfill', async ({
  page,
  baseURL,
}) => {
  await productionPage(page, baseURL!)
  const events = await captureActivity(page)
  await searchResultsRoute(page, [{ id: 'search-item' }])
  await page.route('**/api/links?*', (route) => route.fulfill({ json: { externalLinks: [] } }))
  await page.goto(productionOrigin + listPath)
  await page.getByRole('combobox', { name: 'Song or album title' }).fill('Never')
  const result = resultOptions(page).first()
  await expect(result).toBeVisible()
  await result.click()
  await expect(result).toHaveAttribute('aria-selected', 'true')
  await expect
    .poll(() => events)
    .toEqual([{ name: 'active_use', options: { props: { action: 'item_saved' } } }])
  await result.click()
  await expect(result).toHaveAttribute('aria-selected', 'false')
  await expect
    .poll(() => events)
    .toEqual([
      { name: 'active_use', options: { props: { action: 'item_saved' } } },
      { name: 'active_use', options: { props: { action: 'item_removed' } } },
    ])
})

test('a failed local save is not active usage', async ({ page, baseURL }) => {
  await productionPage(page, baseURL!)
  const events = await captureActivity(page)
  await mockMetadataRoute(page)
  await page.route('**/api/links?*', (route) => route.fulfill({ json: { externalLinks: [] } }))
  await page.goto(productionOrigin + listPath)
  await page.evaluate(() => {
    IDBObjectStore.prototype.add = () => {
      throw new DOMException('Storage full', 'QuotaExceededError')
    }
  })
  await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()
  await page.getByRole('button', { name: 'Add to List' }).click()
  await expect(page.getByRole('dialog')).toContainText('Failed to save item')
  await expect(page.getByRole('row').filter({ hasText: 'Never Gonna Give You Up' })).toHaveCount(0)
  expect(events).toEqual([])
})

for (const exclusion of ['owner', 'automation', 'preview', 'unreadable preference'] as const) {
  test(`${exclusion} activity stays excluded without preventing a save`, async ({
    page,
    baseURL,
  }) => {
    await productionPage(page, baseURL!)
    const events = await captureActivity(page)
    const collectorRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().startsWith('https://analytics.thomasevano.fr/')) {
        collectorRequests.push(request.url())
      }
    })
    await page.addInitScript((mode) => {
      if (mode === 'owner') localStorage.setItem('plausible_ignore', 'true')
      if (mode === 'automation') {
        Object.defineProperty(navigator, 'webdriver', { get: () => true })
      }
      if (mode === 'unreadable preference') {
        // Fail the analytics preference boundary, not unrelated app preferences.
        const getItem = Storage.prototype.getItem
        Storage.prototype.getItem = function (key) {
          if (key === 'plausible_ignore') {
            throw new DOMException('Storage unavailable', 'SecurityError')
          }
          return getItem.call(this, key)
        }
      }
    }, exclusion)
    await mockMetadataRoute(page)
    await page.route('**/api/links?*', (route) => route.fulfill({ json: { externalLinks: [] } }))
    await page.goto(exclusion === 'preview' ? listPath : productionOrigin + listPath)
    await addItem(page)
    expect(events).toEqual([])
    expect(collectorRequests).toEqual([])
  })
}

for (const availability of ['missing', 'throwing'] as const) {
  test(`${availability} analytics does not turn a completed save into a failure`, async ({
    page,
    baseURL,
  }) => {
    await productionPage(page, baseURL!)
    await page.route('https://analytics.thomasevano.fr/**', (route) => route.abort())
    await page.addInitScript((mode) => {
      if (mode === 'throwing') {
        Object.assign(window, {
          plausible: () => {
            throw new Error('Tracker unavailable')
          },
        })
      }
    }, availability)
    await mockMetadataRoute(page)
    await page.route('**/api/links?*', (route) => route.fulfill({ json: { externalLinks: [] } }))
    await page.goto(productionOrigin + listPath)
    await addItem(page)
    await page.reload()
    await expect(page.getByRole('row').filter({ hasText: 'Never Gonna Give You Up' })).toBeVisible()
  })
}
