import { inject } from '@adonisjs/core'
import { AlbumsRepository } from '../../../application/repositories/albums.repository.js'
import type { HttpContext } from '@adonisjs/core/http'
import {
  SPOTIFY_ACCESS_TOKEN_COOKIE_NAME,
  SPOTIFY_ACCESS_TOKEN_EXPIRES_AT_COOKIE_NAME,
  SPOTIFY_REFRESH_TOKEN_COOKIE_NAME,
} from '../../../constants.js'

@inject()
export default class AlbumsController {
  constructor(private albumsRepository: AlbumsRepository) { }

  async index({ inertia, request }: HttpContext) {
    const tokens = {
      accessToken: request.encryptedCookie(SPOTIFY_ACCESS_TOKEN_COOKIE_NAME),
      refreshToken: request.encryptedCookie(SPOTIFY_REFRESH_TOKEN_COOKIE_NAME),
      expiresAt: request.plainCookie(SPOTIFY_ACCESS_TOKEN_EXPIRES_AT_COOKIE_NAME),
    }

    const spotifyAlbumsInfos = await this.albumsRepository.getCurrentUserAlbumsInfos(
      tokens.accessToken
    )

    return inertia.render(
      'albums',
      {
        tokens,
        // spotifyAlbumsInfos,
        // NEVER included on first visit.
        // OPTIONALLY included on partial reloads.
        // ONLY evaluated when needed
        spotifyAlbumsInfos: inertia.optional(() => spotifyAlbumsInfos),
      },
      {
        title: 'Albums - MusicKeeper',
      }
    )
  }
}
