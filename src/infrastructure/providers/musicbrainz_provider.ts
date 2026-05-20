import type { ApplicationService } from '@adonisjs/core/types'
import { SearchGateway } from '#application/ports/search.gateway.js'
import { CoverArtGateway } from '#application/ports/cover_art.gateway.js'
import { PlatformSearchPort } from '#application/ports/platform_search.port.js'
import { MusicBrainzExternalLinksPort } from '#application/ports/musicbrainz_external_links.port.js'
import { MusicBrainzGateway } from '#infrastructure/adapters/musicbrainz/musicbrainz.gateway.js'
import { CoverArtArchiveGateway } from '#infrastructure/adapters/musicbrainz/cover_art.gateway.js'
import { MusicBrainzExternalLinksAdapter } from '#infrastructure/adapters/musicbrainz/musicbrainz_external_links.adapter.js'
import { EnrichMusicItemUseCase } from '#application/use-cases/enrich_music_item.use_case.js'
import { GetExternalLinksUseCase } from '#application/use-cases/get_external_links.use_case.js'

export default class MusicBrainzProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    this.app.container.singleton(SearchGateway, () => {
      return this.app.container.make(MusicBrainzGateway)
    })

    this.app.container.singleton(CoverArtGateway, () => {
      return this.app.container.make(CoverArtArchiveGateway)
    })

    this.app.container.singleton(MusicBrainzExternalLinksPort, () => {
      return this.app.container.make(MusicBrainzExternalLinksAdapter)
    })

    this.app.container.singleton(EnrichMusicItemUseCase, async () => {
      const search = await this.app.container.make(SearchGateway)
      const coverArt = await this.app.container.make(CoverArtGateway)
      return new EnrichMusicItemUseCase(search, coverArt)
    })

    this.app.container.singleton(GetExternalLinksUseCase, async () => {
      const mbLinks = await this.app.container.make(MusicBrainzExternalLinksPort)
      const platformSearch = await this.app.container.make(PlatformSearchPort)
      return new GetExternalLinksUseCase(mbLinks, platformSearch)
    })
  }
}
