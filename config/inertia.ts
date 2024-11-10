import { defineConfig } from '@adonisjs/inertia'

export default defineConfig({
  sharedData: {
    appName: 'MusicKeeper',
  },
  ssr: {
    enabled: true,
    pages: ['home'],
  },
})
