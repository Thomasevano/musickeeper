import type { HttpContext } from '@adonisjs/core/http'
import { SearchRepository } from '../../../application/repositories/search.repository.js'
import { SpotifySearchRepository } from '../../repositories/spotify/spotify_search.repository.js'
import { SPOTIFY_ACCESS_TOKEN_COOKIE_NAME } from '../../../constants.js'

export default class ListenLaterListController {
  constructor(private searchRepository: SearchRepository = new SpotifySearchRepository()) { }
  async index({ inertia, request, response }: HttpContext) {
    const spotifyAccessToken: string = request.encryptedCookie(SPOTIFY_ACCESS_TOKEN_COOKIE_NAME)

    if (!spotifyAccessToken) {
      console.error('No access token found!')
    }

    const searchItem = request.qs().q

    if (searchItem) {
      const matchingItems = await this.searchRepository.searchItem(searchItem, spotifyAccessToken)
      response.status(200).header('Content-Type', 'application/json').send({
        matchingItems,
      })
    }
    return inertia.render(
      'listen-later',
      {},
      {
        title: 'Listen Later - MusicKeeper',
        description:
          'Musickeeper a platform to extract an manage your music library from music streaming services',
      }
    )
  }
}
