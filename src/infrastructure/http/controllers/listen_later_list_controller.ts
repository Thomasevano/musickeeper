import type { HttpContext } from '@adonisjs/core/http'
import { SearchRepository } from '../../../application/repositories/search.repository.js'
import { MusicBrainzRepository } from '../../repositories/musicbrainz_search.repository.js'

export default class ListenLaterListController {
  constructor(private searchRepository: SearchRepository = new MusicBrainzRepository()) {}
  async index({ inertia, request, response }: HttpContext) {
    const searchItem = request.qs().q
    const searchType = request.qs().type

    if (searchItem) {
      const matchingItems = await this.searchRepository.searchItem(searchItem, searchType)
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
