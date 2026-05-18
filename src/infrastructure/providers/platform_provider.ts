import type { ApplicationService } from '@adonisjs/core/types'
import { PlatformSearchPort } from '#application/ports/platform_search.port.js'
import { PlatformSearchAdapter } from '#infrastructure/adapters/platform_search/platform_search.adapter.js'

export default class PlatformProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    this.app.container.bind(PlatformSearchPort, () => {
      return this.app.container.make(PlatformSearchAdapter)
    })
  }
}
