import { NextFn } from '@adonisjs/core/types/http'
import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import { SPOTIFY_ACCESS_TOKEN_COOKIE_NAME } from '../../../constants.js'
import { SpotifyUserRepository } from '../../repositories/spotify/spotify_user.repository.js'

@inject()
export default class ShareUserMiddleware {
  constructor(private spotifyUserRepository: SpotifyUserRepository) { }

  async handle(ctx: HttpContext, next: NextFn) {
    const accessToken = ctx.request.encryptedCookie(SPOTIFY_ACCESS_TOKEN_COOKIE_NAME)

    if (accessToken) {
      try {
        const user = await this.spotifyUserRepository.getCurrentUser(accessToken)
        ctx.inertia.share({ user })
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    await next()
  }
}
