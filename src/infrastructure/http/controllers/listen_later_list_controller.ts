import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { SearchGateway } from '#application/ports/search.gateway.js'
import { SearchType } from '#domain/music_item.js'

@inject()
export default class ListenLaterListController {
  constructor(private searchGateway: SearchGateway) {}

  async index({ inertia, request, response }: HttpContext) {
    const searchItem = request.qs().q
    const searchType = request.qs().type as SearchType | undefined
    const artistName = request.qs().artist

    const hasValidSearch =
      (searchItem && searchItem.length >= 3) || (artistName && artistName.trim().length >= 3)

    if (hasValidSearch) {
      const serializedItems = await this.searchGateway.searchItem(
        searchItem || '',
        searchType,
        artistName
      )
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
