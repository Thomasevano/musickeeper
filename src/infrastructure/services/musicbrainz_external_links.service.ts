import { musicbrainzApi } from '../providers/musicbrainz_provider.js'
import { SearchType } from '../../domain/music_item.js'
import { detectPlatform, normalizeLinkUrl } from '../../shared/platform_registry.js'
import { PlatformSearchService } from './platform_search.service.js'
import type { ExternalLink } from '../../domain/music_item.js'

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ])
}

const KEEP_RELATION_TYPES = [
  'free streaming',
  'streaming',
  'purchase for download',
  'download for free',
  'get the music',
]

interface EntityWithRelations {
  'relations'?: Array<{
    type: string
    url?: { resource: string }
  }>
  'release-group'?: { id: string }
}

function extractLinksFromRelations(
  relations: Array<{ type: string; url?: { resource: string } }>,
  seen: Set<string>
): ExternalLink[] {
  const links: ExternalLink[] = []
  for (const rel of relations) {
    if (!KEEP_RELATION_TYPES.includes(rel.type)) continue

    const resource = rel.url?.resource
    if (!resource) continue

    const spec = detectPlatform(resource)
    if (!spec || seen.has(spec.id)) continue

    seen.add(spec.id)
    links.push({
      platform: spec.id,
      label: spec.label,
      url: resource,
      category: spec.category,
      source: 'musicbrainz',
    })
  }
  return links
}

export class MusicBrainzExternalLinksService {
  private platformSearch = new PlatformSearchService()

  async fetchExternalLinks(mbid: string, itemType: SearchType): Promise<ExternalLink[]> {
    try {
      const entity = itemType === SearchType.album ? 'release' : 'recording'
      const inc = itemType === SearchType.album ? ['url-rels', 'release-groups'] : ['url-rels']
      const result: EntityWithRelations = await withTimeout(
        (musicbrainzApi.lookup as any)(entity, mbid, inc),
        10000
      )
      const relations = result.relations ?? []
      const seen = new Set<string>()
      const links: ExternalLink[] = extractLinksFromRelations(relations, seen)

      if (itemType === SearchType.album && result['release-group']?.id) {
        const releaseGroupId = result['release-group'].id
        try {
          const rgResult: EntityWithRelations = await withTimeout(
            (musicbrainzApi.lookup as any)('release-group', releaseGroupId, ['url-rels']),
            10000
          )
          const rgRelations = rgResult.relations ?? []
          links.push(...extractLinksFromRelations(rgRelations, seen))
        } catch {
          // Release-group lookup is best-effort
        }
      }

      return links
    } catch (error) {
      console.error('Failed to fetch external links from MusicBrainz:', error)
      return []
    }
  }

  async enrichLinks(
    mbid: string,
    itemType: SearchType,
    artists: string[],
    title: string,
    locale: string,
    sourceUrl?: string
  ): Promise<ExternalLink[]> {
    const [mbLinks, searchLinks] = await Promise.all([
      this.fetchExternalLinks(mbid, itemType),
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
