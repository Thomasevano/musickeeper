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
  ...configApp(),
]
