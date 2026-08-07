import { test } from '@japa/runner'
import {
  rowIn,
  rowOut,
} from '../../../../../inertia/components/data-table/data_table_row_transitions.js'

/**
 * The transitions read `window.matchMedia` and `getComputedStyle` as globals, so
 * the OS preference is emulated here instead of in a browser: an end-to-end
 * check would have to import the module over HTTP, which only resolves against
 * the Vite dev server and 404s on a production build.
 */
function withReducedMotion<T>(reduced: boolean, run: () => T): T {
  const globals = globalThis as unknown as { window?: unknown; getComputedStyle?: unknown }
  const previousWindow = globals.window
  const previousGetComputedStyle = globals.getComputedStyle

  globals.window = {
    matchMedia: (query: string) => ({ matches: reduced && query.includes('reduce') }),
  }
  globals.getComputedStyle = () => ({ opacity: '1', transform: 'none' })

  try {
    return run()
  } finally {
    globals.window = previousWindow
    globals.getComputedStyle = previousGetComputedStyle
  }
}

const node = {} as Element

test.group('Data table row transitions', () => {
  test('fades rows without moving them when the OS asks for reduced motion', async ({ assert }) => {
    withReducedMotion(true, () => {
      for (const transition of [rowIn(node), rowOut(node)]) {
        assert.isFunction(transition.css)
        const midpoint = transition.css!(0.5, 0.5)
        assert.include(midpoint, 'opacity')
        assert.notInclude(midpoint, 'transform')
      }
    })
  })

  test('animates rows when motion is allowed', async ({ assert }) => {
    withReducedMotion(false, () => {
      assert.equal(rowIn(node).duration, 180)
      assert.equal(rowOut(node).duration, 160)
      assert.include(rowIn(node).css!(0.5, 0.5), 'transform')
      assert.include(rowOut(node).css!(0.5, 0.5), 'transform')
    })
  })
})
