import { NextFn } from '@adonisjs/core/types/http'
import { HttpContext } from '@adonisjs/core/http'
import {
  SPOTIFY_ACCESS_TOKEN_EXPIRES_AT_COOKIE_NAME,
  SPOTIFY_REFRESH_TOKEN_COOKIE_NAME,
  SPOTIFY_ACCESS_TOKEN_COOKIE_NAME,
} from '../../../constants.js'
import querystring from 'node:querystring'

export default class SpotifyMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const spotifyAccessTokenExpiresAt = ctx.request.plainCookie(
      SPOTIFY_ACCESS_TOKEN_EXPIRES_AT_COOKIE_NAME,
      { encoded: false }
    )
    const spotifyRefreshToken = ctx.request.encryptedCookie(SPOTIFY_REFRESH_TOKEN_COOKIE_NAME)

    const currentDate = Math.floor(Date.now() / 1000)
    const expiresIn = Math.floor((Number.parseInt(spotifyAccessTokenExpiresAt) - currentDate) / 60)

    console.log({
      expiresIn,
      spotifyAccessTokenExpiresAt,
    })

    await next()

    if (expiresIn < 1 || Number.isNaN(expiresIn)) {
      // if (ctx.response.response.statusCode === 401) {
      console.log('access token invalid')
      let body
      try {
        body = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + process.env.SPOTIFY_BASIC_TOKEN,
          },
          body: querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token: spotifyRefreshToken,
          }),
        })
      } catch (error) {
        console.log({ error })
        return
      }

      if (body?.ok) {
        const { access_token, expires_in } = await (body.json() as Promise<{
          access_token: string;
          expires_in: number;
        }>);

        let accessTokenExpiresAt = currentDate + expires_in

        ctx.response.encryptedCookie(SPOTIFY_ACCESS_TOKEN_COOKIE_NAME, access_token)
        ctx.response.plainCookie(
          SPOTIFY_ACCESS_TOKEN_EXPIRES_AT_COOKIE_NAME,
          accessTokenExpiresAt,
          {
            encode: false,
          }
        )
      } else {
        console.log('error refreshing tokens:', body?.status, body?.statusText)
      }
      await next()
    }
  }
}
