import { SearchType } from '#domain/music_item.js'
import type { ExternalLink } from '#domain/music_item.js'
import { detectPlatform, normalizeLinkUrl } from '#shared/platform_registry.js'
import { PlatformSearchPort } from '#application/ports/platform_search.port.js'
import { MusicBrainzExternalLinksPort } from '#application/ports/musicbrainz_external_links.port.js'

export class GetExternalLinksUseCase {
  constructor(
    private musicBrainzLinks: MusicBrainzExternalLinksPort,
    private platformSearch: PlatformSearchPort
  ) {}

  async execute(
    mbid: string,
    itemType: SearchType,
    artists: string[],
    title: string,
    locale: string,
    sourceUrl?: string
  ): Promise<ExternalLink[]> {
    const [mbLinks, searchLinks] = await Promise.all([
      this.musicBrainzLinks.fetchExternalLinks(mbid, itemType),
      this.platformSearch.search(artists, title, itemType),
    ])

    const allLinks: ExternalLink[] = [...mbLinks, ...searchLinks]

    if (sourceUrl) {
      const spec = detectPlatform(sourceUrl)
      if (spec && !allLinks.some((l) => l.platform === spec.id)) {
        allLinks.push({
          platform: spec.id,
          label: spec.label,
          url: sourceUrl,
          category: spec.category,
          source: 'source-url',
        })
      }
    }

    const seen = new Set<string>()
    const result: ExternalLink[] = []

    for (const link of allLinks) {
      if (seen.has(link.platform)) continue
      seen.add(link.platform)
      result.push({
        ...link,
        url: normalizeLinkUrl(link.url, locale),
      })
    }

    return result
  }
}
