import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { isLinkMetadataError } from '#domain/link.js'
import { ExtractLinkMetadataUseCase } from '#application/use-cases/extract_link_metadata.use_case.js'

@inject()
export default class LinkController {
  constructor(private extractLinkMetadata: ExtractLinkMetadataUseCase) {}

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
