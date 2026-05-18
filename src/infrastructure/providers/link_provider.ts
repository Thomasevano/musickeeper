import type { ApplicationService } from '@adonisjs/core/types'
import { LinkParserPort } from '#application/ports/link_parser.port.js'
import { PlatformMetadataPort } from '#application/ports/platform_metadata.port.js'
import { LinkParserAdapter } from '#infrastructure/adapters/link_parser.adapter.js'
import { PlatformMetadataAdapter } from '#infrastructure/adapters/platform_metadata.adapter.js'
import { ExtractLinkMetadataUseCase } from '#application/use-cases/extract_link_metadata.use_case.js'
import { EnrichMusicItemUseCase } from '#application/use-cases/enrich_music_item.use_case.js'

export default class LinkProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    this.app.container.bind(LinkParserPort, () => {
      return this.app.container.make(LinkParserAdapter)
    })

    this.app.container.bind(PlatformMetadataPort, () => {
      return this.app.container.make(PlatformMetadataAdapter)
    })

    this.app.container.bind(ExtractLinkMetadataUseCase, async () => {
      const parser = await this.app.container.make(LinkParserPort)
      const metadata = await this.app.container.make(PlatformMetadataPort)
      const enrich = await this.app.container.make(EnrichMusicItemUseCase)
      return new ExtractLinkMetadataUseCase(parser, metadata, enrich)
    })
  }
}
