import { defineConfig } from 'vite'
import { getDirname } from '@adonisjs/core/helpers'
import inertia from '@adonisjs/inertia/client'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import adonisjs from '@adonisjs/vite/client'
import path from 'node:path'

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['JSZip'],
    },
  },
  plugins: [
    inertia({ ssr: { enabled: false, entrypoint: 'inertia/app/ssr.ts' } }),
    svelte({ compilerOptions: { hydratable: true } }),
    adonisjs({ entrypoints: ['inertia/app/app.ts'], reload: ['resources/views/**/*.edge'] }),
  ],

  /**
   * Define aliases for importing modules from
   * your frontend code
   */
  resolve: {
    alias: {
      '~/': `${getDirname(import.meta.url)}/inertia/`,
      '$lib': `${getDirname(import.meta.url)}/inertia/lib`,
      '$components': path.resolve('./inertia/components'),
      '$helpers': path.resolve('./inertia/lib/helpers'),
    },
  },
})
