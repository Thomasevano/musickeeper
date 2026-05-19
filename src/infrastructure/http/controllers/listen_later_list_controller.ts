import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { SearchGateway } from '#application/ports/search.gateway.js'
import { serializeMusicBrainzSearchResults } from '#infrastructure/serializers/musicbrainz/search_results_serializer.js'

@inject()
export default class ListenLaterListController {
  private serializeSearchResults = serializeMusicBrainzSearchResults

  constructor(private searchGateway: SearchGateway) {}
  async index({ inertia, request, response }: HttpContext) {
    const searchItem = request.qs().q
    const searchType = request.qs().type
    const artistName = request.qs().artist

    const hasValidSearch =
      (searchItem && searchItem.length >= 3) || (artistName && artistName.trim().length >= 3)

    if (hasValidSearch) {
      const matchingItems = await this.searchGateway.searchItem(
        searchItem || '',
        searchType,
        artistName
      )
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
