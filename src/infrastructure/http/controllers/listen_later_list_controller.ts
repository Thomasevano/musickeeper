import type { HttpContext } from '@adonisjs/core/http'
import { SearchRepository } from '../../../application/repositories/search.repository.js'
import { MusicBrainzRepository } from '../../repositories/musicbrainz_search.repository.js'
import { serializeMusicBrainzSearchResults } from '../../serializers/musicbrainz/search_results_serializer.js'

export default class ListenLaterListController {
  constructor(
    private searchRepository: SearchRepository = new MusicBrainzRepository(),
    private serializeSearchResults = serializeMusicBrainzSearchResults
  ) {}
  async index({ inertia, request, response }: HttpContext) {
    const searchItem = request.qs().q
    const searchType = request.qs().type

    if (searchItem && searchItem.length >= 3) {
      const matchingItems = await this.searchRepository.searchItem(searchItem, searchType)
      const serializedItems = await this.serializeSearchResults(matchingItems)
      return response.status(200).header('Content-Type', 'application/json').send({
        serializedItems,
      })
    }
    return inertia.render(
      'listen-later',
      {},
      {
        title: 'Listen Later - MusicKeeper',
        description:
          "got music recommandations you don't want to lose, just add it to the listen later list",
      }
    )
  }
}
