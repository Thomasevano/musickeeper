import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ExtractLinkMetadataUseCase } from '#application/use-cases/extract_link_metadata.use_case.js'

@inject()
export default class LegacyLinkController {
  constructor(private extractLinkMetadata: ExtractLinkMetadataUseCase) {}

  async metadata({ request, response }: HttpContext) {
    const { url } = request.body()
    if (!url || typeof url !== 'string') {
      return response.status(400).json({ error: 'URL is required' })
    }

    const result = await this.extractLinkMetadata.execute(url)
    return response.status('error' in result ? 400 : 200).json(result)
  }
}
