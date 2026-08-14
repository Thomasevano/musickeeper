import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Force JSON for API routes. Hybrid page/data routes negotiate their response
 * from the caller's explicit Accept header.
 */
export default class ForceJsonResponseMiddleware {
  async handle({ request }: HttpContext, next: NextFn) {
    if (request.url().startsWith('/api/')) {
      request.headers().accept = 'application/json'
    }
    return next()
  }
}
