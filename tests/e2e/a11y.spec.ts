import { AxeBuilder } from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import {
  SPOTIFY_URL,
  failNextListLoad,
  heldRoute,
  listenLaterSeed,
  mockMetadataResponse,
  mockMetadataRoute,
  seedListenLaterItems,
  settleAnimations,
} from './fixtures.js'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// A rule parked here owes an entry in docs/a11y.md saying why. The listbox
// popup is the only entry: see the arrow-key test in this file for the journey
// axe cannot see.
const ALLOWED_RULES: string[] = ['scrollable-region-focusable']

// The acceptance bar is `serious`/`critical`. `moderate` and `minor` findings
// are reported by axe but do not fail the suite: they are mostly best-practice
// hints, and gating on them would make the suite noisy enough to be ignored.
const BLOCKING_IMPACT: Record<string, true> = { serious: true, critical: true }

/**
 * Scans the whole page: what sits behind a dialog is part of what has to hold.
 */
async function expectAccessible(page: Page, surface: string, scope?: string) {
  await settleAnimations(page)

  const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS).disableRules(ALLOWED_RULES)
  if (scope) builder.include(scope)

  const { violations } = await builder.analyze()

  // One line per offending node, carrying axe's own reason: a bare rule id and
  // a CSS path leave you re-running the scan by hand to learn the measured
  // contrast or the missing attribute.
  const blocking = violations
    .filter((violation) => BLOCKING_IMPACT[violation.impact ?? ''])
    .flatMap((violation) =>
      violation.nodes.map(
        (node) =>
          `${violation.id} [${violation.impact}] ${node.target.join(' ')} :: ${[
            ...node.any,
            ...node.all,
          ]
            .map((check) => check.message)
            .join('; ')}`
      )
    )

  expect(blocking, `axe violations on ${surface}`).toEqual([])
}

/**
 * bits-ui leaves a modal's background in the accessibility tree and relies on
 * `aria-modal` plus a focus scope to hold a screen reader inside the dialog.
 * So the scan is scoped to the dialog - measuring the page behind a dimming
 * overlay reports contrast failures on text nobody is meant to read - and the
 * modal contract that makes the background irrelevant is asserted rather than
 * assumed.
 */
async function expectAccessibleDialog(page: Page, surface: string) {
  await expect(page.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  await expectAccessible(page, surface, '[role="dialog"]')
}

const addLinkButton = (page: Page) => page.getByRole('button', { name: 'Add', exact: true })

async function openAddDialog(page: Page) {
  await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
  await addLinkButton(page).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

async function isFocusInsideDialog(page: Page) {
  return page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))
}

async function tabUntilFocused(page: Page, target: Locator, limit = 40) {
  for (let press = 0; press < limit; press += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return
    await page.keyboard.press('Tab')
  }
  throw new Error(`focus never reached the target within ${limit} Tab presses`)
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`axe - ${colorScheme}`, () => {
    test.use({ colorScheme })

    test('the requested colour scheme reaches the document', async ({ page }) => {
      await page.goto('/library/listen-later')
      const root = page.locator('html')
      if (colorScheme === 'dark') await expect(root).toHaveClass(/dark/)
      else await expect(root).not.toHaveClass(/dark/)
    })

    test('home page', async ({ page }) => {
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expectAccessible(page, `home (${colorScheme})`)
    })

    test('listen later page, empty and populated', async ({ page }) => {
      await page.goto('/library/listen-later')
      await expect(page.getByText('Add your first item by searching above')).toBeVisible()
      await expectAccessible(page, `listen later empty (${colorScheme})`)

      await seedListenLaterItems(page, [
        listenLaterSeed({ id: 'seed-listened', title: 'Discovery', hasBeenListened: true }),
        listenLaterSeed({ id: 'seed-pending', title: 'Random Access Memories', addedAt: 2 }),
      ])
      await expect(page.getByRole('row').filter({ hasText: 'Discovery' })).toBeVisible()
      await expectAccessible(page, `listen later table (${colorScheme})`)
    })

    test('search results, skeletons then options', async ({ page }) => {
      const answerSearch = await heldRoute(
        page,
        (url) => url.pathname === '/library/listen-later' && url.searchParams.has('type')
      )

      await page.goto('/library/listen-later')
      await page.getByLabel('Artist name', { exact: true }).fill('Rick Astley')

      await expect(page.getByRole('listbox')).toBeVisible()
      await expectAccessible(page, `search skeletons (${colorScheme})`)

      answerSearch({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ serializedItems: [mockMetadataResponse.musicItem] }),
      })

      await expect(page.getByRole('option')).toHaveCount(1)
      await expectAccessible(page, `search results (${colorScheme})`)
    })

    test('the offline alert', async ({ page, context }) => {
      await page.goto('/library/listen-later')
      await context.setOffline(true)

      await expect(page.getByText("You're currently offline")).toBeVisible()
      await expectAccessible(page, `offline alert (${colorScheme})`)
    })

    test('add dialog, then its duplicate state', async ({ page }) => {
      await mockMetadataRoute(page)
      await page.goto('/library/listen-later')

      await openAddDialog(page)
      await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()
      await expectAccessibleDialog(page, `add dialog (${colorScheme})`)

      await page.getByRole('button', { name: 'Add to List' }).click()
      await expect(page.getByRole('dialog')).not.toBeVisible()

      await openAddDialog(page)
      await expect(page.getByRole('heading', { name: 'Duplicate Found' })).toBeVisible()
      await expectAccessibleDialog(page, `duplicate dialog (${colorScheme})`)
    })

    test('the add dialog while it loads, then when the link fails', async ({ page }) => {
      const answerMetadata = await heldRoute(page, (url) => url.pathname === '/api/link/metadata')

      await page.goto('/library/listen-later')
      await page.getByPlaceholder('Paste a link from Spotify').fill(SPOTIFY_URL)
      await addLinkButton(page).click()

      await expect(page.getByRole('heading', { name: 'Processing Link' })).toBeVisible()
      await expectAccessibleDialog(page, `add dialog loading (${colorScheme})`)

      answerMetadata({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'This link could not be read' }),
      })

      await expect(page.getByRole('heading', { name: 'Unable to Process Link' })).toBeVisible()
      await expectAccessibleDialog(page, `add dialog error (${colorScheme})`)
    })

    test('delete confirmation dialog', async ({ page }) => {
      await page.goto('/library/listen-later')
      await seedListenLaterItems(page, [listenLaterSeed({ id: 'seed-delete', title: 'Discovery' })])

      const row = page.getByRole('row').filter({ hasText: 'Discovery' })
      await row.getByRole('button', { name: 'Open menu' }).click()
      await page.getByRole('menuitem', { name: 'Delete' }).click()

      await expect(page.getByRole('heading', { name: 'Are you sure?' })).toBeVisible()
      await expectAccessibleDialog(page, `delete dialog (${colorScheme})`)
    })

    test('a visible toast', async ({ page }) => {
      await mockMetadataRoute(page)
      await page.goto('/library/listen-later')

      await openAddDialog(page)
      await page.getByRole('button', { name: 'Add to List' }).click()

      await expect(page.getByText('"Never Gonna Give You Up" added to your list')).toBeVisible()
      await expectAccessible(page, `toast (${colorScheme})`)
    })

    test('an error toast', async ({ page }) => {
      await failNextListLoad(page)

      await expect(page.getByText('Failed to load your list')).toBeVisible()
      await expectAccessible(page, `error toast (${colorScheme})`)
    })
  })
}

test.describe('axe - mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('listen later cards and the navigation sheet', async ({ page }) => {
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [
      listenLaterSeed({ id: 'seed-mobile', title: 'Discovery', hasBeenListened: true }),
    ])
    await expect(page.getByRole('article').filter({ hasText: 'Discovery' })).toBeVisible()
    await expectAccessible(page, 'listen later cards (mobile)')

    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectAccessibleDialog(page, 'navigation sheet (mobile)')
  })

  test('the add dialog at a phone width', async ({ page }) => {
    await mockMetadataRoute(page)
    await page.goto('/library/listen-later')

    await openAddDialog(page)
    await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()
    await expectAccessibleDialog(page, 'add dialog (mobile)')
  })

  test('the navigation sheet traps focus and gives it back', async ({ page }) => {
    await page.goto('/library/listen-later')

    const trigger = page.getByRole('button', { name: 'Open navigation' })
    await trigger.click()
    await expect(page.getByRole('dialog')).toBeVisible()

    for (let press = 0; press < 15; press += 1) {
      await page.keyboard.press('Tab')
      expect(await isFocusInsideDialog(page)).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(trigger).toBeFocused()
  })
})

test.describe('keyboard', () => {
  test('the paste-link journey completes without a mouse', async ({ page }) => {
    await mockMetadataRoute(page)
    await page.goto('/library/listen-later')

    const linkInput = page.getByPlaceholder('Paste a link from Spotify')
    await tabUntilFocused(page, linkInput)
    await page.keyboard.type(SPOTIFY_URL)

    await tabUntilFocused(page, addLinkButton(page))
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Add to Listen Later' })).toBeVisible()

    await tabUntilFocused(page, page.getByRole('button', { name: 'Add to List' }))
    await page.keyboard.press('Enter')

    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: 'Never Gonna Give You Up' })).toBeVisible()
  })

  test('the add dialog traps focus, closes on Escape, and restores focus', async ({ page }) => {
    await mockMetadataRoute(page)
    await page.goto('/library/listen-later')

    await openAddDialog(page)
    expect(await isFocusInsideDialog(page)).toBe(true)

    for (let press = 0; press < 25; press += 1) {
      await page.keyboard.press('Tab')
      expect(await isFocusInsideDialog(page)).toBe(true)
    }

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(addLinkButton(page)).toBeFocused()
  })

  test('the delete dialog closes on Escape and restores focus to the row menu', async ({
    page,
  }) => {
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [listenLaterSeed({ id: 'seed-escape', title: 'Discovery' })])

    const row = page.getByRole('row').filter({ hasText: 'Discovery' })
    const rowMenu = row.getByRole('button', { name: 'Open menu' })
    await rowMenu.click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await expect(page.getByRole('heading', { name: 'Are you sure?' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(rowMenu).toBeFocused()
    await expect(row).toBeVisible()
  })

  // axe reports the results popup as a scroll region without tabbable content.
  // The options are reachable, just not with Tab: this is the journey axe cannot
  // see, and the reason `scrollable-region-focusable` is parked in docs/a11y.md.
  test('arrow keys reach and scroll the search results', async ({ page }) => {
    await page.route(
      (url) => url.pathname === '/library/listen-later' && url.searchParams.has('type'),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            serializedItems: ['one', 'two', 'three', 'four'].map((suffix, index) => ({
              ...mockMetadataResponse.musicItem,
              id: `result-${suffix}`,
              title: `Result ${index + 1}`,
            })),
          }),
        })
    )

    await page.goto('/library/listen-later')
    const combobox = page.getByLabel('Song or album title', { exact: true })
    await combobox.fill('Result')
    await expect(page.getByRole('option')).toHaveCount(4)

    await combobox.press('ArrowDown')
    await expect(page.getByRole('option').first()).toBeFocused()

    const last = page.getByRole('option').last()
    for (let press = 0; press < 3; press += 1) await page.keyboard.press('ArrowDown')
    await expect(last).toBeFocused()

    // The scroll region followed the focus, which is what the axe rule is asking
    // about: a keyboard user can see every option without a pointer.
    const reach = await last.evaluate((option) => {
      const region = option.closest('[role="listbox"]')?.parentElement
      if (!region) throw new Error('the results list is not inside a scroll region')
      const optionBox = option.getBoundingClientRect()
      const regionBox = region.getBoundingClientRect()
      return {
        scrolled: region.scrollTop > 0,
        inView: optionBox.top >= regionBox.top - 1 && optionBox.bottom <= regionBox.bottom + 1,
      }
    })
    expect(reach).toEqual({ scrolled: true, inView: true })
  })
})

test.describe('announcements', () => {
  test('a toast lands in a named live region', async ({ page }) => {
    await mockMetadataRoute(page)
    await page.goto('/library/listen-later')

    // svelte-sonner marks each toast `aria-live` itself rather than giving it
    // `role="status"`, so the announcement is asserted on the live region that
    // actually carries it.
    const notifications = page.getByRole('region', { name: /^Notifications/ })
    await expect(notifications).toBeAttached()

    await openAddDialog(page)
    await page.getByRole('button', { name: 'Add to List' }).click()

    const toast = notifications.locator('[data-sonner-toast][aria-live="polite"]', {
      hasText: '"Never Gonna Give You Up" added to your list',
    })
    await expect(toast).toBeVisible()
  })

  test('the dialog itself takes focus, so its name and its description are read', async ({
    page,
  }) => {
    await mockMetadataRoute(page)
    await page.goto('/library/listen-later')
    await openAddDialog(page)

    // Left to bits-ui, focus lands on the first tabbable child and a screen
    // reader opens with "Title, edit text" - the dialog's own name and
    // description are never spoken. Only the container carries both.
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeFocused()
    await expect(dialog).toHaveAccessibleName('Add to Listen Later')
    await expect(dialog).toHaveAccessibleDescription(
      'Review the extracted music information before adding.'
    )
  })

  test('the duplicate state is announced after the dialog has opened', async ({ page }) => {
    await mockMetadataRoute(page)
    await page.goto('/library/listen-later')

    await openAddDialog(page)
    await page.getByRole('button', { name: 'Add to List' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // The dialog opens on "Processing Link" and its title is rewritten when the
    // fetch lands. A dialog name is spoken once, on focus, so without a live
    // region the reader is still holding the loading state.
    await openAddDialog(page)
    await expect(page.getByRole('heading', { name: 'Duplicate Found' })).toBeVisible()
    await expect(page.getByRole('dialog').getByRole('status')).toHaveText(
      'Duplicate found. An item with the same title and the same artists is already in your list.'
    )
  })
})
