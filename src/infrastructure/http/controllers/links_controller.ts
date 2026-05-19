import vine from '@vinejs/vine'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { GetExternalLinksUseCase } from '#application/use-cases/get_external_links.use_case.js'
import { SearchType } from '#domain/music_item.js'

const indexQueryValidator = vine.compile(
  vine.object({
    mbid: vine.string().uuid(),
    type: vine.enum(['album', 'track']),
    sourceUrl: vine.string().url().optional(),
    artists: vine.string().optional(),
    title: vine.string().optional(),
    locale: vine.string().optional(),
  })
)

@inject()
export default class LinksController {
  constructor(private getExternalLinks: GetExternalLinksUseCase) {}

  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(indexQueryValidator)

    const itemType = payload.type === 'album' ? SearchType.album : SearchType.track
    const artistsArray = payload.artists ? payload.artists.split(',') : []
    const titleStr = payload.title ?? ''
    const locale = payload.locale ?? 'fr-FR'

    const externalLinks = await this.getExternalLinks.execute(
      payload.mbid,
      itemType,
      artistsArray,
      titleStr,
      locale,
      payload.sourceUrl
    )

    return response.status(200).json({ externalLinks })
  }
}
