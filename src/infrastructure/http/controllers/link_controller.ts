import type { HttpContext } from '@adonisjs/core/http'
import {
  LinkParserService,
  StreamingPlatform,
  isLinkParseError,
} from '../../services/link_parser.service.js'
import { LinkMetadataService, isLinkMetadataError } from '../../services/link_metadata.service.js'
import { PlatformMetadataService } from '../../services/platform_metadata.service.js'

export interface OEmbedResponse {
  title: string
  author_name: string
  thumbnail_url?: string
}

export default class LinkController {
  constructor(
    private linkParser: LinkParserService = new LinkParserService(),
    private linkMetadataService: LinkMetadataService = new LinkMetadataService(),
    private platformMetadataService: PlatformMetadataService = new PlatformMetadataService()
  ) {}

  async oembed({ request, response }: HttpContext) {
    const { url } = request.body()

    if (!url || typeof url !== 'string') {
      return response.status(400).json({ error: 'URL is required' })
    }

    const parseResult = this.linkParser.parseLink(url)

    if (isLinkParseError(parseResult)) {
      return response.status(400).json({ error: parseResult.error })
    }

    if (parseResult.platform === StreamingPlatform.AppleMusic) {
      return response.status(400).json({
        error: 'Apple Music does not support oEmbed. Use /api/link/apple-music instead.',
      })
    }

    const result = await this.platformMetadataService.fetch(parseResult)

    if ('error' in result) {
      const status = result.error.includes('not found')
        ? 404
        : result.error.includes('Failed to connect')
          ? 502
          : 400
      return response.status(status).json({ error: result.error })
    }

    return response.status(200).json(result)
  }

  async appleMusic({ request, response }: HttpContext) {
    const { url } = request.body()

    if (!url || typeof url !== 'string') {
      return response.status(400).json({ error: 'URL is required' })
    }

    const parseResult = this.linkParser.parseLink(url)

    if (isLinkParseError(parseResult)) {
      return response.status(400).json({ error: parseResult.error })
    }

    if (parseResult.platform !== StreamingPlatform.AppleMusic) {
      return response.status(400).json({
        error:
          'This endpoint only accepts Apple Music URLs. Use /api/link/oembed for other platforms.',
      })
    }

    const result = await this.platformMetadataService.fetchAppleMusicMetadata(
      parseResult.originalUrl
    )

    if ('error' in result) {
      return response.status(422).json({ error: result.error })
    }

    return response.status(200).json(result)
  }

  async metadata({ request, response }: HttpContext) {
    const { url } = request.body()

    if (!url || typeof url !== 'string') {
      return response.status(400).json({ error: 'URL is required' })
    }

    const result = await this.linkMetadataService.fetchMetadata(url)

    if (isLinkMetadataError(result)) {
      return response.status(400).json({ error: result.error, originalUrl: result.originalUrl })
    }

    return response.status(200).json({
      musicItem: result.musicItem,
      source: result.source,
      linkMetadata: result.linkMetadata,
    })
  }
}
