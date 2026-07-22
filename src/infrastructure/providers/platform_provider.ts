import type { ApplicationService } from '@adonisjs/core/types'
import { PlatformSearchPort } from '#application/ports/platform_search.port.js'
import { PlatformSearchAdapter } from '#infrastructure/adapters/platform_search/platform_search.adapter.js'
import { AppleSearchClient } from '#infrastructure/adapters/platform_search/apple.client.js'
import { BandcampSearchClient } from '#infrastructure/adapters/platform_search/bandcamp.client.js'
import { DeezerSearchClient } from '#infrastructure/adapters/platform_search/deezer.client.js'
import { QobuzSearchClient } from '#infrastructure/adapters/platform_search/qobuz.client.js'

export default class PlatformProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    this.app.container.singleton(PlatformSearchPort, () => {
      return new PlatformSearchAdapter(
        new DeezerSearchClient(),
        new AppleSearchClient(),
        new QobuzSearchClient(),
        new BandcampSearchClient()
      )
    })
  }
}
