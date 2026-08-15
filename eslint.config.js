import { configApp } from '@adonisjs/eslint-config'

export default [
  {
    // shadcn-svelte generated / vendored UI primitives. These are pulled from
    // the registry and regenerated (`shadcn-svelte add`), so lint the code we
    // author rather than fighting the generator's style on every update.
    ignores: [
      'inertia/lib/components/ui/**',
      'inertia/lib/hooks/**',
      'inertia/lib/utils.ts',
    ],
  },
  {
    // Vendored Effect reference repositories (git-ignored, not project source).
    ignores: ['.effect-references/**'],
  },
  {
    // Svelte components. `@adonisjs/eslint-config` ships vue/react parsers only,
    // so its TS parser cannot read `.svelte` SFCs. Keep them out of scope until
    // an eslint-plugin-svelte config is wired up.
    ignores: ['**/*.svelte'],
  },
  ...configApp(),
  {
    files: ['inertia/**/*.ts'],
    rules: {
      // Only browser dependencies belong here. Keep server infrastructure out of the client bundle.
      '@adonisjs/no-backend-import-in-frontend': [
        'error',
        {
          allowed: [
            '../resources/css/app.css',
            '../../src/domain/music_item.js',
            '../../src/shared/platform_registry.js',
            '../../src/infrastructure/storage/listen_later_storage.js',
          ],
        },
      ],
    },
  },
]
