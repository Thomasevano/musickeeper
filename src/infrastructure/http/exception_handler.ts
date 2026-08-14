import env from '../env.js'
import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction

  protected renderStatusPages = app.inProduction || env.get('E2E_TEST_ROUTES', false)

  protected statusPages = {
    '404': (_: unknown, ctx: HttpContext) => ctx.inertia.render('errors/not_found', {}),
    '500..599': (_: unknown, ctx: HttpContext) => ctx.inertia.render('errors/server_error', {}),
  }
}
