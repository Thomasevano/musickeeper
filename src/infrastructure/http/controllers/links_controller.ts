import vine from '@vinejs/vine'
import type { HttpContext } from '@adonisjs/core/http'
import { MusicBrainzExternalLinksService } from '../../services/musicbrainz_external_links.service.js'
import { SearchType } from '../../../domain/music_item.js'

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

export default class LinksController {
  private linksService = new MusicBrainzExternalLinksService()

  async index({ request, response }: HttpContext) {
    const payload = await request.validateUsing(indexQueryValidator)

    const itemType = payload.type === 'album' ? SearchType.album : SearchType.track
    const artistsArray = payload.artists ? payload.artists.split(',') : []
    const titleStr = payload.title ?? ''
    const locale = payload.locale ?? 'fr-FR'

    const externalLinks = await this.linksService.enrichLinks(
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
