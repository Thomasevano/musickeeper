import { defineConfig } from 'vite'
import { getDirname } from '@adonisjs/core/helpers'
import inertia from '@adonisjs/inertia/client'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import adonisjs from '@adonisjs/vite/client'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  build: {},
  define: {},
  plugins: [
    inertia(),
    svelte(),
    adonisjs({ entrypoints: ['inertia/app/app.ts'], reload: ['resources/views/**/*.edge'] }),
    tailwindcss(),
  ],

  /**
   * Define aliases for importing modules from
   * your frontend code
   */
  resolve: {
    alias: {
      '~/': `${getDirname(import.meta.url)}/inertia/`,
      '$lib': path.resolve('./inertia/lib'),
      '$components': path.resolve('./inertia/components'),
      '$helpers': path.resolve('./inertia/lib/helpers'),
    },
  },
})
