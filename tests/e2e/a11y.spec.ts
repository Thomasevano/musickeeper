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
  searchResultsRoute,
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
      await page.getByRole('menuitem', { name: /^Delete/ }).click()

      await expect(page.getByRole('heading', { name: 'Are you sure?' })).toBeVisible()
      await expectAccessibleDialog(page, `delete dialog (${colorScheme})`)
    })

    test('a visible toast', async ({ page }) => {
      await mockMetadataRoute(page)
      await page.goto('/library/listen-later')

      await openAddDialog(page)
      await page.getByRole('button', { name: 'Add to List' }).click()

      await expect(
        page.getByText('"Never Gonna Give You Up" by Rick Astley added to your list')
      ).toBeVisible()
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
    await page.getByRole('menuitem', { name: /^Delete/ }).click()
    await expect(page.getByRole('heading', { name: 'Are you sure?' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(rowMenu).toBeFocused()
    await expect(row).toBeVisible()
  })

  test('the row menu focuses its first item only once the menu is on screen', async ({ page }) => {
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [listenLaterSeed({ id: 'seed-focus', title: 'Discovery' })])

    // Focus that arrives in the frame the menu is inserted is a move VoiceOver
    // drops: it reads the menu appearing and never says the item focus landed
    // on, so the first action of every row opens silent while the ones reached
    // by an arrow key afterwards all read correctly.
    const opacityAtFocus = page.evaluate(
      () =>
        new Promise<string>((resolve) => {
          document.addEventListener(
            'focusin',
            (event) => {
              const item = event.target as HTMLElement
              if (item.getAttribute('role') !== 'menuitem') return
              const menu = item.closest('[role="menu"]')
              if (!menu) throw new Error('a menu item outside a menu')
              resolve(getComputedStyle(menu).opacity)
            },
            { capture: true }
          )
        })
    )

    await page.getByRole('button', { name: 'Open menu' }).press('Enter')
    expect(await opacityAtFocus).toBe('1')
  })

  // axe reports the results popup as a scroll region without tabbable content.
  // The options are reachable, just not with Tab: this is the journey axe cannot
  // see, and the reason `scrollable-region-focusable` is parked in docs/a11y.md.
  test('arrow keys reach and scroll the search results', async ({ page }) => {
    await searchResultsRoute(
      page,
      ['one', 'two', 'three', 'four'].map((suffix, index) => ({
        id: `result-${suffix}`,
        title: `Result ${index + 1}`,
      }))
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

  // The artist field feeds the same listbox as the title field. Left without a
  // key handler it was a dead end: results appeared, and no key reached them.
  test('arrow keys reach the results from the artist field too', async ({ page }) => {
    await searchResultsRoute(page, [{ id: 'result-one', title: 'Result 1' }])

    await page.goto('/library/listen-later')
    const artist = page.getByLabel('Artist name', { exact: true })
    await artist.fill('Kavinsky')
    await expect(page.getByRole('option')).toHaveCount(1)

    await artist.press('ArrowDown')
    await expect(page.getByRole('option').first()).toBeFocused()
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
      hasText: '"Never Gonna Give You Up" by Rick Astley added to your list',
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

  test('a sort change is announced', async ({ page }) => {
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [
      listenLaterSeed({ id: 'sort-a', title: 'Discovery' }),
      listenLaterSeed({ id: 'sort-b', title: 'Homework' }),
    ])

    // Sorting rewrites the row order with no focus change, so nothing else
    // would tell a reader the list it is standing in has been rearranged.
    const announcement = page.getByRole('status')
    await expect(announcement).toHaveText('')

    await page.getByRole('button', { name: 'Title, not sorted' }).click()
    await expect(announcement).toHaveText('Sorted by Title, ascending')

    await page.getByRole('button', { name: 'Title, sorted ascending' }).click()
    await expect(announcement).toHaveText('Sorted by Title, descending')
  })
})
test('marking an item listened says so out loud', async ({ page }) => {
  await page.goto('/library/listen-later')
  await seedListenLaterItems(page, [
    listenLaterSeed({ id: 'listened-item', title: 'Discovery', artists: ['Daft Punk'] }),
  ])

  // The write only repaints a badge on a row the reader has already passed.
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('menuitem', { name: /as listened$/ }).click()

  await expect(page.getByText('"Discovery" by Daft Punk marked as listened')).toBeVisible()
})

test.describe('accessible names', () => {
  // A `<label for>` cannot label a button. Where a browser honours it anyway it
  // replaces the name rather than prefixing it, and the chosen value is lost.
  test('a select trigger is named by its label and its current value', async ({ page }) => {
    await mockMetadataRoute(page)
    await page.goto('/library/listen-later')

    await expect(page.locator('#search-type')).toHaveAccessibleName('Type: Tracks')

    await openAddDialog(page)
    await expect(page.locator('#item-type-trigger')).toHaveAccessibleName('Item Type: Track')
  })

  test('a result option is named by everything it shows', async ({ page }) => {
    await searchResultsRoute(page, [
      { id: 'result-solo', title: 'Nightcall', artists: ['Kavinsky'] },
      { id: 'result-guests', title: 'Nightcall', artists: ['Kavinsky', 'Angèle', 'Phoenix'] },
    ])

    await page.goto('/library/listen-later')
    await page.getByLabel('Song or album title', { exact: true }).fill('Nightcall')
    await expect(page.getByRole('option')).toHaveCount(2)

    // An `aria-label` here replaced the four lines the option prints with a
    // summary of two of them, so the album and the release date were on screen
    // and unreadable. Another Version shares the title, so the artists decide.
    await expect(page.getByRole('option').first()).toHaveAccessibleName(
      'Title: Nightcall Artists: Kavinsky Album: Whenever You Need Somebody Release Date: 2023-06-15'
    )
    await expect(page.getByRole('option').last()).toHaveAccessibleName(
      'Title: Nightcall Artists: Kavinsky, Angèle, Phoenix Album: Whenever You Need Somebody Release Date: 2023-06-15'
    )
  })

  test('a result option says what Enter will do, before and after adding', async ({ page }) => {
    await searchResultsRoute(page, [{ id: 'result-one', title: 'Nightcall' }])

    await page.goto('/library/listen-later')
    await page.getByLabel('Song or album title', { exact: true }).fill('Nightcall')

    // A tick is the whole difference between the two states on screen, and
    // `aria-selected` renders it as "selected" - true of nothing else here.
    const option = page.getByRole('option')
    await expect(option).toHaveAccessibleDescription('Press Enter to add it to your list.')

    await option.click()
    await expect(page.getByText('"Nightcall" by Rick Astley added to your list')).toBeVisible()
    await expect(option).toHaveAccessibleDescription(
      'In your list already. Press Enter to remove it.'
    )
  })

  test('a row menu names the item its actions will act on', async ({ page }) => {
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [
      listenLaterSeed({ id: 'menu-row', title: 'Discovery', artists: ['Daft Punk'] }),
    ])

    await page.getByRole('button', { name: 'Open menu' }).click()

    // The menu floats away from its row, so by the time it is read the row it
    // belongs to is out of the reading order and cannot supply the name.
    await expect(page.getByRole('menuitem').first()).toHaveAccessibleName(
      'Mark "Discovery" by Daft Punk as listened'
    )
    await expect(page.getByRole('menuitem').last()).toHaveAccessibleName(
      'Delete "Discovery" by Daft Punk'
    )
  })

  test('every column header says which column it heads', async ({ page }) => {
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [
      listenLaterSeed({ id: 'scope-row', title: 'Discovery', artists: ['Daft Punk'] }),
    ])

    // `scope` is what pairs a value with its field name. Without it the reader
    // walking a row reads "Daft Punk" and never says which column that was, and
    // no accessibility-tree query exposes the pairing - only the markup does.
    await expect(page.locator('table thead th:not([scope="col"])')).toHaveCount(0)
    await expect(page.locator('table tbody th:not([scope="row"])')).toHaveCount(0)
  })

  test('no icon in a row is read as a picture', async ({ page }) => {
    await page.goto('/library/listen-later')
    // One row per icon in the table: the type badge branches on `itemType`, the
    // status badge on `hasBeenListened`, and the links cell renders nothing
    // without a link.
    await seedListenLaterItems(page, [
      listenLaterSeed({
        id: 'icon-track',
        title: 'Discovery',
        itemType: 'track',
        hasBeenListened: true,
        externalLinks: [
          { platform: 'spotify', label: 'Spotify', url: 'https://x.test', category: 'stream' },
        ],
      }),
      listenLaterSeed({ id: 'icon-album', title: 'Homework', itemType: 'album' }),
    ])
    // The badges pair an icon with the word it stands for, so the icon adds
    // nothing but an "image" between the reader and the value. The cover is the
    // exception - it is the only thing in its column, and carries the alt text.
    await expect(page.locator('table tbody svg:not([aria-hidden="true"])')).toHaveCount(0)
  })

  test('the results listbox owns its options directly', async ({ page }) => {
    await searchResultsRoute(page, [{ id: 'result-one', title: 'Result 1' }])

    await page.goto('/library/listen-later')
    await page.getByLabel('Song or album title', { exact: true }).fill('Result')
    await expect(page.getByRole('option')).toHaveCount(1)

    // `listbox` may only own `option` children. A wrapper in between - the
    // loading skeleton used to leave two divs there - costs the option its
    // position in the set and VoiceOver reads it as an unnamed selectable.
    const strays = await page.getByRole('listbox').evaluate((list) =>
      Array.from(list.children)
        .filter((child) => child.getAttribute('role') !== 'option')
        .map((child) => child.tagName.toLowerCase())
    )
    expect(strays).toEqual([])
  })

  test('a row action trigger is named after its item', async ({ page }) => {
    await page.goto('/library/listen-later')
    await seedListenLaterItems(page, [
      listenLaterSeed({ id: 'row-a', title: 'Discovery', artists: ['Daft Punk'] }),
      listenLaterSeed({ id: 'row-b', title: 'Homework', artists: ['Daft Punk'] }),
    ])

    // Every row carried the same "Open menu". Out of the table's reading order
    // - the rotor lists them all - identical names name nothing.
    await expect(
      page.getByRole('button', { name: 'Open menu for "Discovery" by Daft Punk' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Open menu for "Homework" by Daft Punk' })
    ).toBeVisible()
  })
})
test('the title cell heads its row', async ({ page }) => {
  await page.goto('/library/listen-later')
  await seedListenLaterItems(page, [
    listenLaterSeed({ id: 'header-row', title: 'Discovery', artists: ['Daft Punk'] }),
  ])

  // Reading across a row, a screen reader prefixes each cell with its row
  // header. Without one the cells arrive unattached to anything.
  await expect(page.getByRole('rowheader', { name: 'Discovery' })).toBeVisible()
})
test('the delete confirmation names what it will remove', async ({ page }) => {
  await page.goto('/library/listen-later')
  await seedListenLaterItems(page, [
    listenLaterSeed({ id: 'delete-target', title: 'Discovery', artists: ['Daft Punk'] }),
  ])

  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('menuitem', { name: /^Delete/ }).click()

  // "Are you sure?" and "Confirm" describe nothing on their own, and the
  // dialog is the one place the item being destroyed has to be stated.
  await expect(page.getByRole('dialog')).toHaveAccessibleDescription(
    '"Discovery" by Daft Punk will be permanently removed from your listen later list.'
  )
  await expect(page.getByRole('button', { name: /^Confirm/ })).toHaveAccessibleName(
    'Confirm , permanently remove "Discovery" by Daft Punk'
  )
})
test('both search fields point at the arrow-key hint', async ({ page }) => {
  await page.goto('/library/listen-later')

  // Nothing on screen says which key reaches the results.
  const hint = 'Results appear below as you type. Press the down arrow key to reach them.'
  await expect(page.getByLabel('Song or album title', { exact: true })).toHaveAccessibleDescription(
    hint
  )
  await expect(page.getByLabel('Artist name', { exact: true })).toHaveAccessibleDescription(hint)
})
