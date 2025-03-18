import { NextFn } from '@adonisjs/core/types/http'
import { HttpContext } from '@adonisjs/core/http'

import {
  SPOTIFY_REFRESH_TOKEN_COOKIE_NAME,
  SPOTIFY_ACCESS_TOKEN_COOKIE_NAME,
} from '../../../constants.js'

export default class SpotifyAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const accessToken = ctx.request.encryptedCookie(SPOTIFY_ACCESS_TOKEN_COOKIE_NAME)
    const refreshToken = ctx.request.encryptedCookie(SPOTIFY_REFRESH_TOKEN_COOKIE_NAME)

    if (!accessToken || !refreshToken) {
      return ctx.response.redirect('/')
    }

    await next()
  }
}
