import { NextFn } from '@adonisjs/core/types/http'
import { HttpContext } from '@adonisjs/core/http'
import {
  SPOTIFY_ACCESS_TOKEN_EXPIRES_AT_COOKIE_NAME,
  SPOTIFY_REFRESH_TOKEN_COOKIE_NAME,
  SPOTIFY_ACCESS_TOKEN_COOKIE_NAME,
} from '../../../constants.js'

export default class SpotifyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const spotifyAccessTokenExpiresAt = ctx.request.plainCookie(
      SPOTIFY_ACCESS_TOKEN_EXPIRES_AT_COOKIE_NAME,
      { encoded: false }
    )
    const spotifyRefreshToken = ctx.request.encryptedCookie(SPOTIFY_REFRESH_TOKEN_COOKIE_NAME)
    const spotifyAccessToken = ctx.request.encryptedCookie(SPOTIFY_ACCESS_TOKEN_COOKIE_NAME)

    const currentDate = Math.floor(Date.now() / 1000)
    const expiresIn = Math.floor((Number.parseInt(spotifyAccessTokenExpiresAt) - currentDate) / 60)

    console.log({
      expiresIn,
      currentDate,
      spotifyAccessTokenExpiresAt,
      spotifyRefreshToken,
      spotifyAccessToken,
    })

    if (expiresIn < 45) {
      console.log('access token invalid')
      await fetch(`${process.env.BASE_URL}/api/auth/spotify/refresh`, {
        headers: { cookie: `${SPOTIFY_REFRESH_TOKEN_COOKIE_NAME}=${spotifyRefreshToken}` },
      })
      return next()
    }
    // ctx.request.request.headers['cookie'] = `SPOTIFY_ACCESS_TOKEN_COOKIE_NAME=${spotifyAccessToken}`
    return next()
  }
}
