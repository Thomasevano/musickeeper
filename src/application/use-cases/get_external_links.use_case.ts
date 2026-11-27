import { type SearchType } from '#domain/music_item.js'
import type { ExternalLink } from '#domain/music_item.js'
import { detectPlatform, normalizeLinkUrl } from '#shared/platform_registry.js'
import { type PlatformSearchPort } from '#application/ports/platform_search.port.js'
import { type MusicBrainzExternalLinksPort } from '#application/ports/musicbrainz_external_links.port.js'

function destinationKey(url: string, locale: string): string {
  const normalized = normalizeLinkUrl(url, locale)
  try {
    const parsed = new URL(normalized)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return normalized
    if (parsed.host === 'youtu.be') {
      const video = /^\/([\w-]{11})\/?$/.exec(parsed.pathname)
      if (video) return `youtube:video:${video[1]}`
    }
    if (
      (parsed.host === 'youtube.com' || parsed.host.endsWith('.youtube.com')) &&
      parsed.pathname === '/watch'
    ) {
      const video = parsed.searchParams.get('v')
      if (video && /^[\w-]{11}$/.test(video)) return `youtube:video:${video}`
    }
    if (parsed.hostname === 'open.spotify.com') {
      const resource = /^\/(track|album)\/([A-Za-z0-9]+)\/?$/.exec(parsed.pathname)
      if (resource) return `spotify:${resource[1]}:${resource[2]}`
    }
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

function selectYouTubeCatalog(
  links: ExternalLink[],
  sourceKey: string | undefined,
  locale: string
) {
  let fallback: ExternalLink | undefined
  for (const link of links) {
    if (link.platform !== 'youtube-music' || destinationKey(link.url, locale) === sourceKey)
      continue
    // MusicBrainz relations have already passed platform URL recognition.
    if (new URL(link.url).host !== 'youtu.be') return link
    fallback ??= link
  }
  return fallback
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

    const sourceKey = sourcePlatform && sourceUrl ? destinationKey(sourceUrl, locale) : undefined
    const catalog = selectYouTubeCatalog(mbLinks, sourceKey, locale)
    const allLinks = mbLinks.filter((link) => link.platform !== 'youtube-music' || link === catalog)
    allLinks.push(...searchLinks)

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
