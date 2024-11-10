import { defineConfig } from '@adonisjs/inertia'

export default defineConfig({
  sharedData: {
    appName: import.meta.env.VITE_APP_NAME,
  },
  ssr: {
    enabled: false,
    pages: ['home'],
  },
})
