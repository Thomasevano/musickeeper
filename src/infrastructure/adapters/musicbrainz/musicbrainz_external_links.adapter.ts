import { musicbrainzApi } from './musicbrainz_client.js'
import { SearchType } from '#domain/music_item.js'
import { detectPlatform } from '#shared/platform_registry.js'
import type { ExternalLink } from '#domain/music_item.js'
import { MusicBrainzExternalLinksPort } from '#application/ports/musicbrainz_external_links.port.js'
import type {
  IMayHaveRelations,
  IRecording,
  IRelease,
  IReleaseGroup,
} from 'musicbrainz-api'

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

export function extractLinksFromRelations(
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

export class MusicBrainzExternalLinksAdapter extends MusicBrainzExternalLinksPort {
  async fetchExternalLinks(mbid: string, itemType: SearchType): Promise<ExternalLink[]> {
    try {
      const result: IRelease | IRecording =
        itemType === SearchType.album
          ? await withTimeout(
              musicbrainzApi.lookup('release', mbid, ['url-rels', 'release-groups']),
              10000
            )
          : await withTimeout(musicbrainzApi.lookup('recording', mbid, ['url-rels']), 10000)

      const relations = result.relations ?? []
      const seen = new Set<string>()
      const links: ExternalLink[] = extractLinksFromRelations(relations, seen)

      if ('release-group' in result && result['release-group']?.id) {
        const releaseGroupId = result['release-group'].id
        try {
          // Vendor IReleaseGroup omits `relations`, but MB returns them when url-rels requested.
          const rgResult = (await withTimeout(
            musicbrainzApi.lookup('release-group', releaseGroupId, ['url-rels']),
            10000
          )) as IReleaseGroup & IMayHaveRelations
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
}
