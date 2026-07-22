import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { StreamingPlatform, isLinkParseError, isLinkMetadataError } from '#domain/link.js'
import { LinkParserPort } from '#application/ports/link_parser.port.js'
import {
  PlatformMetadataPort,
  type PlatformMetadata,
} from '#application/ports/platform_metadata.port.js'
import { ExtractLinkMetadataUseCase } from '#application/use-cases/extract_link_metadata.use_case.js'

export interface OEmbedResponse {
  title: string
  author_name: string
  thumbnail_url?: string
  album_name?: string
}

function toOEmbedResponse(metadata: PlatformMetadata): OEmbedResponse {
  const result: OEmbedResponse = {
    title: metadata.title,
    author_name: metadata.artist,
    thumbnail_url: metadata.thumbnailUrl,
  }
  if (metadata.albumName) result.album_name = metadata.albumName
  return result
}

@inject()
export default class LinkController {
  constructor(
    private linkParser: LinkParserPort,
    private platformMetadata: PlatformMetadataPort,
    private extractLinkMetadata: ExtractLinkMetadataUseCase
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

    const result = await this.platformMetadata.fetch(parseResult)

    if ('error' in result) {
      const status = result.error.includes('not found')
        ? 404
        : result.error.includes('Failed to connect')
          ? 502
          : 400
      return response.status(status).json({ error: result.error })
    }

    return response.status(200).json(toOEmbedResponse(result))
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

    const result = await this.platformMetadata.fetch(parseResult)

    if ('error' in result) {
      return response.status(422).json({ error: result.error })
    }

    return response.status(200).json(toOEmbedResponse(result))
  }

  async metadata({ request, response }: HttpContext) {
    const { url } = request.body()

    if (!url || typeof url !== 'string') {
      return response.status(400).json({ error: 'URL is required' })
    }

    const result = await this.extractLinkMetadata.execute(url)

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
