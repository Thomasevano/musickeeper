import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import {
  FetchPlatformMetadataUseCase,
  type FetchPlatformMetadataError,
} from '#application/use-cases/fetch_platform_metadata.use_case.js'

@inject()
export default class LinkController {
  constructor(private fetchPlatformMetadata: FetchPlatformMetadataUseCase) {}

  async platformMetadata({ request, response }: HttpContext) {
    const { url } = request.body()

    if (!url || typeof url !== 'string') {
      return response.status(400).json({ error: 'URL is required' })
    }

    const result = await this.fetchPlatformMetadata.execute(url)
    if ('error' in result) {
      return response.status(this.platformErrorStatus(result)).json({
        error: result.error,
        originalUrl: result.originalUrl,
      })
    }

    return response.status(200).json(result)
  }

  private platformErrorStatus(result: FetchPlatformMetadataError) {
    if (result.kind === 'validation') return 400
    if (result.error.includes('not found')) return 404
    if (result.error.includes('Failed to connect')) return 502
    return 400
  }
}
