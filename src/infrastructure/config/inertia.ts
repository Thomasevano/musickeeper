import { defineConfig } from '@adonisjs/inertia'

export default defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: true,
    entrypoint: 'inertia/ssr.ts',
    pages: ['home'],
  },
})

/**
 * Page props, keyed by page component name. AdonisJS generates this map for
 * React and Vue apps via the `indexPages` assembler hook; that hook has no
 * Svelte support, so this app declares its pages by hand.
 */
declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'home': {}
    'listen-later': { title: string }
    'errors/not_found': {}
    'errors/server_error': {}
  }
}
