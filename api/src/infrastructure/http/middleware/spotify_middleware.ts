import { NextFn } from '@adonisjs/core/types/http'
import { HttpContext } from '@adonisjs/core/http'

export default class SpotifyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const spotifyAccessTokenExpiresAt = ctx.request.cookie('spotify_access_token_expires-at')
    const spotifyRefreshToken = ctx.request.cookie('spotify_refresh_token')

    const currentDate = Math.floor(Date.now() / 1000)
    const difference = Math.floor((Number.parseInt(spotifyAccessTokenExpiresAt) - currentDate) / 60)
    console.log({ difference, currentDate, spotifyAccessTokenExpiresAt, spotifyRefreshToken })
    if (difference > 1) {
      console.log('access token valid')
      return next()
    } else {
      console.log('access token invalid')
      await fetch(`${process.env.BASE_URL}/api/auth/spotify/refresh`, {
        headers: { cookie: `spotify_refresh_token=${spotifyRefreshToken}` },
      })
      return next()
    }
  }
}
