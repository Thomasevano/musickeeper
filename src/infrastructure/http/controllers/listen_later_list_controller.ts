import vine from '@vinejs/vine'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { SearchPort } from '#application/ports/search.port.js'
import { SearchType } from '#domain/music_item.js'

const searchQueryValidator = vine.compile(
  vine.object({
    q: vine.string().trim().minLength(3).optional(),
    type: vine.enum(['album', 'track']).optional(),
    artist: vine.string().trim().minLength(3).optional(),
  })
)

@inject()
export default class ListenLaterListController {
  constructor(private searchPort: SearchPort) {}

  async index({ inertia, request, response }: HttpContext) {
    const payload = await request.validateUsing(searchQueryValidator)
    const searchType = payload.type === 'album' ? SearchType.album : SearchType.track

    if (payload.q || payload.artist) {
      const serializedItems = await this.searchPort.searchItem(
        payload.q ?? '',
        searchType,
        payload.artist
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
