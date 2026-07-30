import env from '../env.js'
import { defineConfig, drivers } from '@adonisjs/core/encryption'

/**
 * The legacy driver keeps decrypting data (cookies, signed URLs) that was
 * encrypted by AdonisJS v6 using the same APP_KEY.
 */
export default defineConfig({
  default: 'legacy',
  list: {
    legacy: drivers.legacy({
      keys: [env.get('APP_KEY')],
    }),
  },
})
