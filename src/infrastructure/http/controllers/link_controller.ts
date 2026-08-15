import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { isLinkMetadataError } from '#domain/link.js'
import { ExtractLinkMetadataUseCase } from '#application/use-cases/extract_link_metadata.use_case.js'
import {
  FetchPlatformMetadataUseCase,
  type FetchPlatformMetadataResult,
} from '#application/use-cases/fetch_platform_metadata.use_case.js'
import type { PlatformMetadata } from '#application/ports/platform_metadata.port.js'

@inject()
export default class LinkController {
  constructor(
    private fetchPlatformMetadata: FetchPlatformMetadataUseCase,
    private extractLinkMetadata: ExtractLinkMetadataUseCase
  ) {}

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

  async platformMetadata({ request, response }: HttpContext) {
    const { url } = request.body()

    if (!url || typeof url !== 'string') {
      return response.status(400).json({ error: 'URL is required' })
    }

    try {
      new URL(url)
    } catch {
      return response.status(400).json({ error: 'Invalid URL format' })
    }

    const result = await this.fetchPlatformMetadata.execute(url)

    if ('error' in result) {
      return response.status(this.platformErrorStatus(result)).json({ error: result.error })
    }

    return response.status(200).json(LinkController.toOEmbedResponse(result))
  }

  private platformErrorStatus(result: Exclude<FetchPlatformMetadataResult, PlatformMetadata>) {
    if (result.kind === 'validation') return 400
    if (result.error.includes('not found')) return 404
    if (result.error.includes('Failed to connect')) return 502
    return 400
  }

  private static toOEmbedResponse(metadata: PlatformMetadata) {
    return {
      title: metadata.title,
      author_name: metadata.artist,
      thumbnail_url: metadata.thumbnailUrl,
      ...(metadata.albumName ? { album_name: metadata.albumName } : {}),
    }
  }
}
