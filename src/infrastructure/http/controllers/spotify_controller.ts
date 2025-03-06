import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import querystring from 'node:querystring'
import {
  SPOTIFY_ACCESS_TOKEN_COOKIE_NAME,
  SPOTIFY_ACCESS_TOKEN_EXPIRES_AT_COOKIE_NAME,
  SPOTIFY_REFRESH_TOKEN_COOKIE_NAME,
} from '../../../constants.js'

function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

@inject()
export default class SpotifyController {
  constructor() { }

  login({ response }: HttpContext): void {
    const state = generateRandomString(16)
    response.cookie('spotify_auth_state', state)

    var scope =
      'user-read-private user-read-email playlist-read-private playlist-read-collaborative user-read-private user-read-email playlist-read-private playlist-read-collaborative'
    response
      .redirect()
      .status(307)
      .toPath(
        `https://accounts.spotify.com/authorize?${querystring.stringify({
          response_type: 'code',
          client_id: process.env.SPOTIFY_CLIENT_ID,
          scope,
          redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
          state,
        })}`
      )
  }

  async callback({ request, response }: HttpContext): Promise<void> {
    const { code, state } = request.qs()
    const storedState = request.cookie('spotify_auth_state')

    if (state === null || state !== storedState) {
      response.redirect().toPath('/' + querystring.stringify({ error: 'state_mismatch' }))
      return
    }
    response.clearCookie('spotify_auth_state')

    let responseToken
    try {
      responseToken = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + process.env.SPOTIFY_BASIC_TOKEN,
        },
        body: querystring.stringify({
          code,
          redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      })
    } catch (error) {
      response
        .redirect()
        .toPath('/auth/spotify' + querystring.stringify({ error: 'token_fetch_error' }))
      return
    }

    if (responseToken?.ok) {
      const { access_token, refresh_token, expires_in } = await (responseToken.json() as Promise<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
      }>);

      const currentDate = Math.floor(Date.now() / 1000)
      const accessTokenExpiresAt = currentDate + expires_in

      response.encryptedCookie(SPOTIFY_ACCESS_TOKEN_COOKIE_NAME, access_token)
      response.encryptedCookie(SPOTIFY_REFRESH_TOKEN_COOKIE_NAME, refresh_token)
      response.plainCookie(SPOTIFY_ACCESS_TOKEN_EXPIRES_AT_COOKIE_NAME, accessTokenExpiresAt, {
        encode: false,
      })

      response.redirect().toPath(`/library/playlists`)
    } else {
      console.log(responseToken?.status)
    }
  }

  async refreshToken({ request, response }: HttpContext): Promise<void> {
    const refreshToken = request.encryptedCookie(SPOTIFY_REFRESH_TOKEN_COOKIE_NAME)

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
          refresh_token: refreshToken,
        }),
      })
    } catch (error) {
      // response
      //   .redirect()
      //   .toPath('/api/spotify' + querystring.stringify({ error: 'refresh_token_fetch_error' }))
      console.log({ error })
      return
    }

    if (body?.ok) {
      const { access_token, expires_in } = await (body.json() as Promise<{
        access_token: string;
        expires_in: number;
      }>);

      const currentDate = Math.floor(Date.now() / 1000)
      let accessTokenExpiresAt = currentDate + expires_in

      response.encryptedCookie(SPOTIFY_ACCESS_TOKEN_COOKIE_NAME, access_token)
      response.plainCookie(SPOTIFY_ACCESS_TOKEN_EXPIRES_AT_COOKIE_NAME, accessTokenExpiresAt, {
        encode: false,
      })
    } else {
      console.log('error refreshing tokens:', body?.status, body?.statusText)
    }
  }

  async logout({ response }: HttpContext): Promise<void> {
    response.clearCookie('spotify_auth_state')
  }
}
