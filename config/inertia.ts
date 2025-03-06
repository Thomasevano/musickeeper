import { defineConfig } from '@adonisjs/inertia'

export default defineConfig({
  ssr: {
    enabled: false,
    pages: ['home'],
  },
})
