import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  listenLaterSeed,
  mockMetadataResponse,
  seedListenLaterItems,
  SPOTIFY_URL,
} from './fixtures.js'

test.use({ serviceWorkers: 'block' })

const banner = (page: Page) => page.getByRole('region', { name: 'Application update' })
const reloadButton = (page: Page) =>
  page.getByRole('button', { name: 'Reload MusicKeeper', exact: true })
const changedVersion = '11111111111111111111111111111111'

async function detectUpdate(page: Page) {
  await page.route('**/app-version', (route) =>
    route.fulfill({ json: { version: changedVersion } })
  )
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(banner(page)).toBeVisible()
}

// Hold a real write transaction after its put succeeds: request success is not commit.
async function holdNextWrite(page: Page) {
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args) {
      IDBObjectStore.prototype.put = original
      const request = original.apply(this, args)
      const transaction = this.transaction
      let held = true
      Object.assign(window, {
        releaseWrite: (abort: boolean) => {
          held = false
          if (abort) transaction.abort()
        },
      })
      request.addEventListener('success', () => {
        Object.assign(window, { writeHeld: true })
        const keepAlive = () => {
          if (held) this.get('__hold__').onsuccess = keepAlive
        }
        keepAlive()
      })
      return request
    }
  })
}

test('a frontend change during search offers reload without losing input or focus', async ({
  page,
}) => {
  await page.route(
    (url) => url.pathname === '/library/listen-later' && url.searchParams.has('type'),
    (route) =>
      route.fulfill({
        json: { serializedItems: [] },
        headers: { 'X-App-Version': '11111111111111111111111111111111' },
      })
  )
  await page.goto('/library/listen-later')
  const title = page.getByRole('combobox', { name: 'Song or album title' })
  await title.fill('Nightcall')
  await expect(page.getByRole('button', { name: 'Reload MusicKeeper', exact: true })).toBeVisible()
  await expect(title).toHaveValue('Nightcall')
  await expect(title).toBeFocused()
})

test('cancelling a keyboard-requested reload retains unfinished input and restores focus', async ({
  page,
}) => {
  await page.goto('/library/listen-later')
  const input = page.getByRole('textbox', { name: 'Music link URL' })
  await input.fill(SPOTIFY_URL)
  await detectUpdate(page)
  await reloadButton(page).focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Keep editing' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog).not.toBeVisible()
  await expect(input).toHaveValue(SPOTIFY_URL)
  await expect(reloadButton(page)).toBeFocused()
  await expect(banner(page)).toBeVisible()
})

test('metadata detection respects the open addition dialog', async ({ page }) => {
  await page.route('**/api/link/metadata', (route) =>
    route.fulfill({
      json: mockMetadataResponse,
      headers: { 'X-App-Version': changedVersion },
    })
  )
  await page.goto('/library/listen-later')
  await page.getByRole('textbox', { name: 'Music link URL' }).fill(SPOTIFY_URL)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(
    mockMetadataResponse.musicItem.title
  )
  await expect(banner(page)).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(
      true
    )
  }
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(reloadButton(page)).toBeVisible()
})

test('a pending transaction must commit before reload confirmation can proceed', async ({
  page,
}) => {
  await page.goto('/library/listen-later')
  await seedListenLaterItems(page, [listenLaterSeed({ id: 'held', title: 'Discovery' })])
  await page.getByRole('textbox', { name: 'Music link URL' }).fill(SPOTIFY_URL)
  await detectUpdate(page)
  await holdNextWrite(page)
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('menuitem', { name: /as listened$/ }).click()
  await page.waitForFunction(() => Reflect.get(window, 'writeHeld'))
  await reloadButton(page).click()
  await expect(page.getByRole('button', { name: 'Preparing update…', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.evaluate(() => Reflect.get(window, 'releaseWrite')(false))
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Keep editing' }).click()
  await page.reload()
  await expect(page.getByRole('row').filter({ hasText: 'Discovery' })).toContainText('Listened')
})

test('an aborted pending transaction keeps its error instead of reloading', async ({ page }) => {
  await page.goto('/library/listen-later')
  await seedListenLaterItems(page, [listenLaterSeed({ id: 'aborted', title: 'Discovery' })])
  await detectUpdate(page)
  await holdNextWrite(page)
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('menuitem', { name: /as listened$/ }).click()
  await page.waitForFunction(() => Reflect.get(window, 'writeHeld'))
  await reloadButton(page).click()
  await expect(page.getByRole('button', { name: 'Preparing update…', exact: true })).toBeVisible()
  await page.evaluate(() => Reflect.get(window, 'releaseWrite')(true))
  await expect(banner(page).getByRole('alert')).toBeVisible()
  await expect(page.getByText(/Could not update.*Discovery/)).toBeVisible()
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: 'Discovery' })
      .getByText('Not listened', { exact: true })
  ).toBeVisible()
  await expect(banner(page)).toBeVisible()
})

test('foreground checks coalesce without polling and stale signals cannot dismiss an update', async ({
  page,
}) => {
  const deployed = await page.request.get('/app-version')
  const { version: currentVersion } = await deployed.json()
  const answer = Promise.withResolvers<void>()
  let checks = 0
  let version = currentVersion
  await page.route('**/app-version', async (route) => {
    checks++
    await answer.promise
    await route.fulfill({ json: { version } })
  })
  await page.goto('/library/listen-later')
  await page.clock.install()
  await page.clock.fastForward(600_000)
  expect(checks).toBe(0)
  await expect(banner(page)).not.toBeVisible()
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('online'))
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => checks).toBe(1)
  const received = page.waitForResponse('**/app-version')
  answer.resolve()
  await received
  await expect(banner(page)).not.toBeVisible()
  version = '0'
  await page.clock.fastForward(1_001)
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(banner(page)).toBeVisible()
  version = currentVersion
  await page.clock.fastForward(1_001)
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect.poll(() => checks).toBe(3)
  await expect(banner(page)).toHaveCount(1)
  await expect(banner(page)).toBeVisible()
})

test('failed or invalid checks are inconclusive and offline reload preserves input', async ({
  page,
}) => {
  let response: { status: number; json: unknown } = { status: 503, json: {} }
  await page.route('**/app-version', async (route) => {
    await route.fulfill(response)
  })
  await page.goto('/library/listen-later')
  await page.clock.install()
  for (const inconclusive of [
    { status: 503, json: {} },
    { status: 200, json: {} },
    { status: 200, json: { version: '' } },
    { status: 200, json: { version: { hash: changedVersion } } },
  ]) {
    response = inconclusive
    const received = page.waitForResponse('**/app-version')
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await received
    await page.clock.fastForward(1_001)
    await expect(banner(page)).not.toBeVisible()
  }
  response = { status: 200, json: { version: changedVersion } }
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(banner(page)).toBeVisible()
  const input = page.getByRole('textbox', { name: 'Music link URL' })
  await input.fill(SPOTIFY_URL)
  await page.route('**/app-version', (route) => route.abort('internetdisconnected'))
  await reloadButton(page).click()
  await page.getByRole('button', { name: 'Discard changes and reload' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Keep editing' }).click()
  await expect(input).toHaveValue(SPOTIFY_URL)
  await expect(banner(page)).toBeVisible()
})

test('Inertia version conflicts leave the running page and unfinished input intact', async ({
  page,
}) => {
  await page.goto('/library/listen-later')
  const input = page.getByRole('textbox', { name: 'Music link URL' })
  await input.fill(SPOTIFY_URL)
  // Public cancelable Inertia event; today's navigation links are ordinary anchors.
  const allowed = await page.evaluate(() =>
    document.dispatchEvent(
      new CustomEvent('inertia:location', {
        cancelable: true,
        detail: { url: new URL('/', location.href), versionChange: true },
      })
    )
  )
  expect(allowed).toBe(false)
  await expect(banner(page)).toBeVisible()
  await expect(page).toHaveURL(/\/library\/listen-later$/)
  await expect(input).toHaveValue(SPOTIFY_URL)
})

test('a write failing during reload preparation must not be hidden by navigation', async ({
  page,
}) => {
  await page.goto('/library/listen-later')
  await seedListenLaterItems(page, [listenLaterSeed({ id: 'late-failure', title: 'Discovery' })])
  await detectUpdate(page)
  const answer = Promise.withResolvers<void>()
  const requested = Promise.withResolvers<void>()
  await page.route('**/app-version', async (route) => {
    requested.resolve()
    await answer.promise
    await route.fulfill({ json: { version: changedVersion } })
  })
  await reloadButton(page).click()
  await requested.promise
  await holdNextWrite(page)
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('menuitem', { name: /as listened$/ }).click()
  await page.waitForFunction(() => Reflect.get(window, 'writeHeld'))
  await page.evaluate(() => Reflect.get(window, 'releaseWrite')(true))
  await expect(page.getByText(/Could not update.*Discovery/)).toBeVisible()
  answer.resolve()
  await expect(banner(page).getByRole('alert')).toBeVisible()
  await expect(page.getByText(/Could not update.*Discovery/)).toBeVisible()
})

test('offline status prevents leaving the page even if a version response remains reachable', async ({
  page,
  context,
}) => {
  await page.goto('/library/listen-later')
  await detectUpdate(page)
  await context.setOffline(true)
  await reloadButton(page).click()
  await expect(banner(page).getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/library\/listen-later$/)
  await expect(page.getByRole('heading', { name: 'Listen Later', exact: true })).toBeVisible()
})

test('reconnection is not suppressed by a foreground check that just failed', async ({ page }) => {
  let checks = 0
  await page.route('**/app-version', (route) => {
    checks++
    return checks === 1
      ? route.abort('internetdisconnected')
      : route.fulfill({ json: { version: changedVersion } })
  })
  await page.goto('/library/listen-later')
  await page.clock.install()
  await page.clock.pauseAt(new Date())
  const failed = page.waitForEvent('requestfailed', (request) =>
    request.url().endsWith('/app-version')
  )
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await failed
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(banner(page)).toBeVisible()
  expect(checks).toBe(2)
})

test('reconnection survives a foreground check that fails after the online event', async ({
  page,
}) => {
  const answer = Promise.withResolvers<void>()
  const requested = Promise.withResolvers<void>()
  let checks = 0
  await page.route('**/app-version', async (route) => {
    checks++
    if (checks === 1) {
      requested.resolve()
      await answer.promise
      await route.abort('internetdisconnected')
    } else {
      await route.fulfill({ json: { version: changedVersion } })
    }
  })
  await page.goto('/library/listen-later')
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await requested.promise
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  answer.resolve()
  await expect(banner(page)).toBeVisible()
  expect(checks).toBe(2)
})

test('a reload superseded by another deployment does not report a false failure', async ({
  page,
}) => {
  const deployed = await page.request.get('/app-version')
  const { version: currentVersion } = await deployed.json()
  let reloaded = false
  await page.route('**/app-version', (route) =>
    route.fulfill({ json: { version: reloaded ? currentVersion : changedVersion } })
  )
  await page.route(
    (url) => url.searchParams.has('__mk_update'),
    async (route) => {
      reloaded = true
      await route.continue()
    }
  )
  await page.goto('/library/listen-later')
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(banner(page)).toBeVisible()
  const reconciled = page.waitForResponse(
    (response) => response.url().endsWith('/app-version') && reloaded
  )
  await reloadButton(page).click()
  await reconciled
  await page.waitForURL((url) => !url.searchParams.has('__mk_update'))
  await expect.poll(() => reloaded).toBe(true)
  await expect(page.getByRole('heading', { name: 'Listen Later', exact: true })).toBeVisible()
  await expect(banner(page)).not.toBeVisible()
})

test('a marked reload still warns when a fresh check confirms the loaded frontend is old', async ({
  page,
}) => {
  await page.route('**/app-version', (route) =>
    route.fulfill({ json: { version: changedVersion } })
  )
  await page.goto(`/library/listen-later?__mk_update=${changedVersion}`)
  await expect(banner(page)).toBeVisible()
  await expect(banner(page).getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/library\/listen-later$/)
})

test('a failed marked-reload reconciliation makes no update claim', async ({ page }) => {
  await page.route('**/app-version', (route) => route.fulfill({ status: 503, body: '' }))
  const checked = page.waitForResponse('**/app-version')
  await page.goto(`/library/listen-later?__mk_update=${changedVersion}`)
  await checked
  await expect(page.getByRole('heading', { name: 'Listen Later', exact: true })).toBeVisible()
  await expect(banner(page)).not.toBeVisible()
  await expect(page).toHaveURL(/\/library\/listen-later$/)
})

test('a deferred reconnection check does not retry again without another event', async ({
  page,
}) => {
  const answer = Promise.withResolvers<void>()
  const requested = Promise.withResolvers<void>()
  let checks = 0
  await page.route('**/app-version', async (route) => {
    checks++
    if (checks === 1) {
      requested.resolve()
      await answer.promise
    }
    await route.abort('internetdisconnected')
  })
  await page.goto('/library/listen-later')
  await page.clock.install()
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await requested.promise
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  const failed = page.waitForEvent(
    'requestfailed',
    (request) => request.url().endsWith('/app-version') && checks === 2
  )
  answer.resolve()
  await failed
  await page.clock.fastForward(600_000)
  expect(checks).toBe(2)
  await expect(banner(page)).not.toBeVisible()
})
