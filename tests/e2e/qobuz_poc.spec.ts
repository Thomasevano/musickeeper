import { test, expect } from '@playwright/test'
import { AxeBuilder } from '@axe-core/playwright'

const albums = [
  ['Endlessness', 'Nala Sinephro'],
  ['A LA SALA', 'Khruangbin'],
  ['Cascade', 'Floating Points'],
  ['Lives Outgrown', 'Beth Gibbons'],
  ['Waltz for Debby', 'Bill Evans Trio'],
  ['In Rainbows', 'Radiohead'],
] as const

const endlessness = 'Endlessness by Nala Sinephro'
const aLaSala = 'A LA SALA by Khruangbin'

test.use({ serviceWorkers: 'block' })

test('saves to the shared library, persists, filters, and removes without confirmation', async ({
  page,
}) => {
  await page.goto('/qobuz')
  await expect(
    page.getByRole('heading', { name: 'Great finds deserve a second listen.' })
  ).toBeVisible()

  for (const [title, artist] of albums) {
    await expect(
      page.getByRole('article', { name: `${title} by ${artist}`, exact: true })
    ).toBeVisible()
  }

  const card = page.getByRole('article', { name: endlessness, exact: true })
  await card.getByRole('button', { name: 'Save Endlessness for later', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Saved Endlessness', exact: true })).toBeDisabled()
  await page
    .getByRole('article', { name: aLaSala, exact: true })
    .getByRole('button', { name: 'Save A LA SALA for later', exact: true })
    .click()
  await expect(
    page
      .getByRole('article', { name: aLaSala, exact: true })
      .getByRole('button', { name: 'Saved A LA SALA', exact: true })
  ).toBeDisabled()

  await page.reload()
  await expect(card.getByRole('button', { name: 'Saved Endlessness', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'MusicKeeper', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your next great listen.' })).toBeVisible()
  await expect(page.getByRole('article', { name: endlessness, exact: true })).toBeVisible()
  await expect(page.getByRole('article', { name: aLaSala, exact: true })).toBeVisible()

  // Check the real application view, not a mocked route or a separate concept store.
  await page.goto('/library/listen-later')
  const libraryRow = page.getByRole('row').filter({ hasText: 'Endlessness' })
  await expect(libraryRow).toBeVisible()
  await expect(libraryRow).toContainText('Nala Sinephro')
  await expect(page.getByRole('row').filter({ hasText: 'A LA SALA' })).toBeVisible()

  await page.goto('/qobuz')
  await page.getByRole('button', { name: 'MusicKeeper', exact: true }).click()
  await page.getByRole('button', { name: 'All saved', exact: true }).click()
  const keeperRow = page.getByRole('article', { name: endlessness, exact: true })
  const otherRow = page.getByRole('article', { name: aLaSala, exact: true })
  await keeperRow.getByRole('button', { name: 'Mark Endlessness as listened', exact: true }).click()
  await expect(
    keeperRow.getByRole('button', { name: 'Mark Endlessness as unlistened', exact: true })
  ).toBeVisible()

  await page.getByRole('button', { name: 'To listen', exact: true }).click()
  await expect(keeperRow).toHaveCount(0)
  await expect(otherRow).toBeVisible()
  await page.getByRole('button', { name: 'Listened', exact: true }).click()
  await expect(keeperRow).toBeVisible()
  await expect(otherRow).toHaveCount(0)
  await page.getByRole('button', { name: 'All saved', exact: true }).click()
  await expect(keeperRow).toBeVisible()
  await expect(otherRow).toBeVisible()

  await keeperRow.getByRole('button', { name: 'Remove Endlessness', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(keeperRow).toHaveCount(0)
  await expect(otherRow).toBeVisible()
  await expect(page.getByRole('status')).toBeVisible()
  await expect(page.getByRole('status')).not.toBeEmpty()

  await page.goto('/library/listen-later')
  await expect(page.getByRole('row').filter({ hasText: 'Endlessness' })).toHaveCount(0)
  await expect(page.getByRole('row').filter({ hasText: 'A LA SALA' })).toBeVisible()
})

test('explains the independent concept in the About dialog', async ({ page }) => {
  await page.goto('/qobuz')
  await expect(page.getByText('Independent concept', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'About this concept', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('No streaming or Qobuz account connection.')
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await expect(dialog).not.toBeVisible()
})

test('search shows a zero state and restores results when cleared', async ({ page }) => {
  await page.goto('/qobuz')
  const search = page.getByRole('searchbox', { name: 'Search albums and artists', exact: true })
  await search.fill('not a real album or artist 987654321')
  await expect(page.getByRole('article')).toHaveCount(0)
  await expect(page.getByText(/no (albums|results|matches|finds)/i)).toBeVisible()
  await search.clear()
  await expect(page.getByRole('article', { name: endlessness, exact: true })).toBeVisible()
})

test('filters by genre and saves an album from its details', async ({ page }) => {
  await page.goto('/qobuz')
  await page.getByRole('button', { name: 'Jazz', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(2)
  const card = page.getByRole('article', { name: endlessness, exact: true })
  await expect(card).toBeVisible()
  await expect(
    page.getByRole('article', { name: 'Waltz for Debby by Bill Evans Trio', exact: true })
  ).toBeVisible()

  await card.getByRole('button', { name: 'Explore Endlessness', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Save for later', exact: true }).click()
  await dialog.getByRole('button', { name: 'Close album details', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(card.getByRole('button', { name: 'Saved Endlessness', exact: true })).toBeDisabled()
})

test('shows an empty saved library', async ({ page }) => {
  await page.goto('/qobuz')
  await page.getByRole('button', { name: 'MusicKeeper', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your next great listen.' })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(0)
})

test('reports unavailable IndexedDB instead of allowing a fake save', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window.indexedDB, 'open', {
      value: () => {
        throw new DOMException('IndexedDB unavailable', 'SecurityError')
      },
    })
  })
  await page.goto('/qobuz')
  await expect(page.getByRole('alert')).toBeVisible()
  const card = page.getByRole('article', { name: endlessness, exact: true })
  await expect(
    card.getByRole('button', { name: 'Save Endlessness for later', exact: true })
  ).toBeDisabled()
  await expect(card.getByRole('button', { name: 'Saved Endlessness', exact: true })).toHaveCount(0)
})

test('fits a mobile viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/qobuz')
  await expect(
    page.getByRole('heading', { name: 'Great finds deserve a second listen.' })
  ).toBeVisible()
  await expect(page.getByRole('article', { name: endlessness, exact: true })).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )
    )
    .toBeLessThanOrEqual(0)
  await page.getByRole('button', { name: 'MusicKeeper', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your next great listen.' })).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )
    )
    .toBeLessThanOrEqual(0)
})

test('meets WCAG AA checks across discovery, details, about, and the saved library', async ({
  page,
}) => {
  await page.goto('/qobuz')
  const card = page.getByRole('article', { name: endlessness, exact: true })
  await card.getByRole('button', { name: 'Save Endlessness for later', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Saved Endlessness', exact: true })).toBeDisabled()

  const checkAccessibility = async () => {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    expect(result.violations).toEqual([])
  }

  await checkAccessibility()
  await card.getByRole('button', { name: 'Explore Endlessness', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await checkAccessibility()
  await page.getByRole('button', { name: 'Close album details', exact: true }).click()
  await page.getByRole('button', { name: 'About this concept', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await checkAccessibility()
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await page.getByRole('button', { name: 'MusicKeeper', exact: true }).click()
  await checkAccessibility()
})

test('meets WCAG AA checks on mobile discovery', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/qobuz')
  await expect(
    page.getByRole('heading', { name: 'Great finds deserve a second listen.' })
  ).toBeVisible()
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(result.violations).toEqual([])
})

test('updates local state from committed writes without re-reading the library', async ({
  page,
}) => {
  await page.goto('/qobuz')
  const card = page.getByRole('article', { name: endlessness, exact: true })
  await expect(
    card.getByRole('button', { name: 'Save Endlessness for later', exact: true })
  ).toBeEnabled()

  // ADR 0001: a later read failure must not turn a committed write into a UI failure.
  await page.evaluate(() => {
    IDBObjectStore.prototype.getAll = () => {
      throw new Error('Unexpected full-library read after a write')
    }
  })

  await card.getByRole('button', { name: 'Save Endlessness for later', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Saved Endlessness', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'MusicKeeper', exact: true }).click()
  const row = page.getByRole('article', { name: endlessness, exact: true })
  await row.getByRole('button', { name: 'Mark Endlessness as listened', exact: true }).click()
  await expect(
    row.getByRole('button', { name: 'Mark Endlessness as unlistened', exact: true })
  ).toBeVisible()
  await row.getByRole('button', { name: 'Remove Endlessness', exact: true }).click()
  await expect(row).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('Endlessness removed')
  await expect(page.getByRole('alert')).toHaveCount(0)

  // Reload restores the native method and confirms the removal was persisted.
  await page.reload()
  await page.getByRole('button', { name: 'MusicKeeper', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Your next discovery belongs here.' })
  ).toBeVisible()
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
  await page.goto('/qobuz')
  await expect(page.getByRole('alert')).toContainText('Your library could not be opened')
  await page.getByRole('button', { name: 'Reload to try again', exact: true }).click()
  const card = page.getByRole('article', { name: endlessness, exact: true })
  await expect(
    card.getByRole('button', { name: 'Save Endlessness for later', exact: true })
  ).toBeEnabled()
  await card.getByRole('button', { name: 'Save Endlessness for later', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Saved Endlessness', exact: true })).toBeDisabled()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
