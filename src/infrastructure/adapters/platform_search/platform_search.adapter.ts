import type { ExternalLink, SearchType } from '#domain/music_item.js'
import { PLATFORMS } from '#shared/platform_registry.js'
import { PlatformSearchPort } from '#application/ports/platform_search.port.js'
import { DeezerSearchClient } from './deezer.client.js'
import { AppleSearchClient } from './apple.client.js'
import { QobuzSearchClient } from './qobuz.client.js'
import { BandcampSearchClient } from './bandcamp.client.js'
import type { PlatformSearchResult } from './match.js'

export class PlatformSearchAdapter extends PlatformSearchPort {
  constructor(
    private deezer: DeezerSearchClient = new DeezerSearchClient(),
    private apple: AppleSearchClient = new AppleSearchClient(),
    private qobuz: QobuzSearchClient = new QobuzSearchClient(),
    private bandcamp: BandcampSearchClient = new BandcampSearchClient()
  ) {
    super()
  }

  async search(
    artists: string[],
    title: string,
    itemType: SearchType
  ): Promise<ExternalLink[]> {
    const query = `${artists.join(' ')} ${title}`
    const results: PlatformSearchResult[] = []

    const settled = await Promise.allSettled([
      this.deezer.search(artists, title, itemType),
      this.apple.search(artists, title, itemType),
      this.qobuz.search(query, itemType),
      this.bandcamp.search(query, itemType),
    ])

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(...result.value)
      }
    }

    const seen = new Set<string>()
    const links: ExternalLink[] = []

    for (const r of results) {
      if (seen.has(r.platform)) continue
      if (!PLATFORMS.some((p) => p.id === r.platform)) continue
      const spec = PLATFORMS.find((p) => p.id === r.platform)!
      seen.add(r.platform)
      links.push({
        platform: spec.id,
        label: spec.label,
        url: r.url,
        category: spec.category,
        source: 'platform-search',
      })
    }

    return links
  }
}
