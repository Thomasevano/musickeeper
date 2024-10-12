import { HttpContext } from '@adonisjs/core/http'
import querystring from 'node:querystring'

function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export default class SpotifyController {
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
        .toPath('/api/spotify' + querystring.stringify({ error: 'token_fetch_error' }))
      return
    }

    if (responseToken?.ok) {
      const responseTokenJSON = await responseToken.json()
      const accessToken = responseTokenJSON.access_token
      const refreshToken = responseTokenJSON.refresh_token

      response.cookie('spotify_access_token', accessToken)
      response.cookie('spotify_refresh_token', refreshToken)
      response.redirect().toPath(`${process.env.FRONTEND_URL}/library/playlists`)
    } else {
      console.log(responseToken?.status)
    }
  }

  async refreshToken({ request, response }: HttpContext): void {
    const { refresh_token } = request.qs()

    let responseRefreshToken
    try {
      responseRefreshToken = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + process.env.SPOTIFY_BASIC_TOKEN,
        },
        body: querystring.stringify({
          refresh_token,
          grant_type: 'refresh_token',
        }),
      })
    } catch (error) {
      response
        .redirect()
        .toPath('/api/spotify' + querystring.stringify({ error: 'refresh_token_fetch_error' }))
      return
    }

    if (responseRefreshToken?.ok) {
      const responseRefreshTokenJSON = await responseRefreshToken.json()
      const accessToken = responseRefreshTokenJSON.access_token

      console.log({ accessToken })
    } else {
      console.log(responseRefreshToken?.status)
    }
  }

  async logout({ response }: HttpContext): void {
    response.clearCookie('spotify_auth_state')
  }
}
