import { defineConfig } from 'vite'
import { getDirname } from '@adonisjs/core/helpers'
import inertia from '@adonisjs/inertia/client'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import adonisjs from '@adonisjs/vite/client'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {},
  define: {},
  plugins: [
    inertia({
      ssr: {
        enabled: true,
        entrypoint: 'inertia/app/ssr.ts',
      },
    }),
    svelte(),
    adonisjs({ entrypoints: ['inertia/app/app.ts'], reload: ['resources/views/**/*.edge'] }),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      // Output SW to public/ (root) so SW has full scope
      outDir: 'public',
      buildBase: '/',
      // Use our own manifest file in public/ instead of generating one
      manifest: false,
      // Use injectManifest for custom service worker
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        globDirectory: 'build/public',
        globPatterns: ['assets/**/*.{js,css,woff,woff2}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
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
