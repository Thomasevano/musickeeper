import { type SearchType } from '#domain/music_item.js'
import type { ExternalLink } from '#domain/music_item.js'
import { detectPlatform, normalizeLinkUrl } from '#shared/platform_registry.js'
import { type PlatformSearchPort } from '#application/ports/platform_search.port.js'
import { type MusicBrainzExternalLinksPort } from '#application/ports/musicbrainz_external_links.port.js'

function destinationKey(url: string, locale: string): string {
  const normalized = normalizeLinkUrl(url, locale)
  try {
    const parsed = new URL(normalized)
    if (parsed.hostname === 'music.apple.com') {
      const parts = parsed.pathname.split('/').filter(Boolean)
      const typeIndex = parts.findIndex((part) => part === 'album' || part === 'song')
      if (typeIndex !== -1) {
        const type = parts[typeIndex]
        const pathId = parts.at(-1)
        const trackId = parsed.searchParams.get('i')
        if (type === 'album' && trackId && /^\d+$/.test(trackId)) {
          return `apple:track:${trackId}`
        }
        if (pathId && /^\d+$/.test(pathId) && (type === 'song' || !trackId)) {
          return `apple:${type === 'song' ? 'track' : 'album'}:${pathId}`
        }
      }
    }
  } catch {
    // Invalid URLs retain their normalized value as their identity.
  }
  return normalized
}

export class GetExternalLinksUseCase {
  constructor(
    private musicBrainzLinks: MusicBrainzExternalLinksPort,
    private platformSearch: PlatformSearchPort
  ) {}

  async execute(
    mbid: string | undefined,
    itemType: SearchType,
    artists: string[],
    title: string,
    locale: string,
    sourceUrl?: string
  ): Promise<ExternalLink[]> {
    const sourcePlatform = sourceUrl ? detectPlatform(sourceUrl) : null
    const [mbLinks, searchLinks] = await Promise.all([
      mbid ? this.musicBrainzLinks.fetchExternalLinks(mbid, itemType) : [],
      this.platformSearch.search(artists, title, itemType),
    ])

    const allLinks: ExternalLink[] = [...mbLinks, ...searchLinks]

    if (sourceUrl) {
      const spec = sourcePlatform
      if (spec) {
        allLinks.unshift({
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
      const key = destinationKey(link.url, locale)
      if (seen.has(key)) continue
      seen.add(key)
      result.push({
        ...link,
        url: link.source === 'source-url' ? link.url : normalizeLinkUrl(link.url, locale),
      })
    }

    return result
  }
}
