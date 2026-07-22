import type { ApplicationService } from '@adonisjs/core/types'
import { LinkParserPort } from '#application/ports/link_parser.port.js'
import { PlatformMetadataPort } from '#application/ports/platform_metadata.port.js'
import { LinkParserAdapter } from '#infrastructure/adapters/link_parser.adapter.js'
import { PlatformMetadataAdapter } from '#infrastructure/adapters/platform_metadata.adapter.js'
import { ExtractLinkMetadataUseCase } from '#application/use-cases/extract_link_metadata.use_case.js'
import { EnrichMusicItemUseCase } from '#application/use-cases/enrich_music_item.use_case.js'
import { FetchOEmbedMetadataUseCase } from '#application/use-cases/fetch_oembed_metadata.use_case.js'
import { FetchAppleMusicMetadataUseCase } from '#application/use-cases/fetch_apple_music_metadata.use_case.js'

export default class LinkProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    this.app.container.singleton(LinkParserPort, () => {
      return this.app.container.make(LinkParserAdapter)
    })

    this.app.container.singleton(PlatformMetadataPort, () => {
      return this.app.container.make(PlatformMetadataAdapter)
    })

    this.app.container.singleton(FetchOEmbedMetadataUseCase, async () => {
      const parser = await this.app.container.make(LinkParserPort)
      const metadata = await this.app.container.make(PlatformMetadataPort)
      return new FetchOEmbedMetadataUseCase(parser, metadata)
    })

    this.app.container.singleton(FetchAppleMusicMetadataUseCase, async () => {
      const parser = await this.app.container.make(LinkParserPort)
      const metadata = await this.app.container.make(PlatformMetadataPort)
      return new FetchAppleMusicMetadataUseCase(parser, metadata)
    })

    this.app.container.singleton(ExtractLinkMetadataUseCase, async () => {
      const parser = await this.app.container.make(LinkParserPort)
      const metadata = await this.app.container.make(PlatformMetadataPort)
      const enrich = await this.app.container.make(EnrichMusicItemUseCase)
      return new ExtractLinkMetadataUseCase(parser, metadata, enrich)
    })
  }
}
