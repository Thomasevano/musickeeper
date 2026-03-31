import type { JSONDataTypes } from '@adonisjs/core/types/transformers'

/**
 * Augment InertiaPages with all known Svelte page components.
 * Since @adonisjs/inertia's indexPages hook does not support Svelte,
 * page names are registered manually here.
 */
declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    [key: string]: Record<string, JSONDataTypes>
  }
}
