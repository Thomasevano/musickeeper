// Throwaway comparison: real use cases/parser/enricher, simulated provider and search responses.
import { ExtractLinkMetadataUseCase as Before } from './extract_link_metadata.prototype_before.js'
import { ExtractLinkMetadataUseCase as AsIs } from './extract_link_metadata.prototype_as_is.js'
import { ExtractLinkMetadataUseCase as Contextual } from './extract_link_metadata.use_case.js'
import { FetchPlatformMetadataUseCase as Pr67 } from './fetch_platform_metadata.prototype_pr67.js'
import { FetchPlatformMetadataUseCase } from './fetch_platform_metadata.use_case.js'
import { EnrichMusicItemUseCase } from './enrich_music_item.use_case.js'
import { LinkParserAdapter } from '#infrastructure/adapters/link_parser.adapter.js'
import { type PlatformMetadata } from '#application/ports/platform_metadata.port.js'
import { type ParsedLink } from '#domain/link.js'
import { MusicItem, SearchType } from '#domain/music_item.js'

export const variants = ['before', 'pr67', 'contextual'] as const
export type Variant = (typeof variants)[number]
export const scenarios = [
  {
    id: 'match',
    label: 'Track match',
    description:
      'Paste a Spotify track. Platform album and artwork must win over the compilation match.',
    url: 'https://open.spotify.com/track/demo123',
  },
  {
    id: 'fallback',
    label: 'No match',
    description:
      'MusicBrainz finds nothing. Keep the platform title, artist, artwork and source URL.',
    url: 'https://open.spotify.com/track/demo123',
  },
  {
    id: 'search-error',
    label: 'Search offline',
    description: 'Search throws. The existing fallback must still produce a music item.',
    url: 'https://youtu.be/demo123',
  },
  {
    id: 'album',
    label: 'Album fallback',
    description: 'An Apple Music album has no search match. Preserve album type and name.',
    url: 'https://music.apple.com/us/album/demo/123456',
  },
  {
    id: 'no-art',
    label: 'Missing artwork',
    description:
      'Platform supplies no cover. The enricher may make a second album search for artwork.',
    url: 'https://open.spotify.com/track/demo123',
  },
  {
    id: 'no-artist',
    label: 'Missing artist',
    description: 'Platform supplies no artist. Skip enrichment and preserve the partial metadata.',
    url: 'https://soundcloud.com/demo/track',
  },
  {
    id: 'provider-error',
    label: 'Provider failure',
    description: 'Platform returns an error. Do not call MusicBrainz; preserve the original URL.',
    url: 'https://open.spotify.com/track/demo123',
  },
  {
    id: 'invalid',
    label: 'Invalid URL',
    description: 'Reject before fetching anything. The public error contract remains unchanged.',
    url: 'not-a-valid-url',
  },
  {
    id: 'unsupported',
    label: 'Unsupported site',
    description:
      'A valid URL is not a supported music platform. Reject without provider or search calls.',
    url: 'https://example.com/music',
  },
] as const

export async function runScenario(id: string, variant: Variant, urlOverride?: string) {
  const scenario = scenarios.find((entry) => entry.id === id)!
  const trace: { action: string; input: unknown; output: unknown }[] = []
  const parser = new LinkParserAdapter()
  const trackedParser = {
    parseLink(url: string) {
      const result = parser.parseLink(url)
      trace.push({ action: 'parse', input: url, output: result })
      return result
    },
  }
  const provider = {
    async fetch(link: ParsedLink): Promise<PlatformMetadata | { error: string }> {
      const result =
        id === 'provider-error'
          ? { error: 'Fixture provider unavailable' }
          : {
              title: link.type === SearchType.album ? 'Original Album' : 'Demo Track',
              artist: id === 'no-artist' ? '' : 'Demo Artist',
              thumbnailUrl: id === 'no-art' ? undefined : 'https://example.com/platform-cover.jpg',
              albumName: 'Original Album',
            }
      trace.push({ action: 'platform fetch', input: link, output: result })
      return result
    },
  }
  const search = {
    async searchItem(query: string, type: SearchType, artist?: string): Promise<MusicItem[]> {
      if (id === 'search-error') {
        trace.push({
          action: 'search',
          input: { query, type, artist },
          output: { error: 'Fixture search offline' },
        })
        throw new Error('Fixture search offline')
      }
      const items = ['fallback', 'album'].includes(id)
        ? []
        : [
            new MusicItem({
              id: type === SearchType.album ? 'mb-album' : 'mb-track',
              title: type === SearchType.album ? 'Original Album' : 'Demo Track',
              artists: ['Demo Artist'],
              releaseDate: '2023-01-01',
              itemType: type,
              albumName: type === SearchType.album ? 'Original Album' : 'Compilation',
              coverArt:
                type === SearchType.album
                  ? 'https://example.com/album-cover.jpg'
                  : 'https://example.com/compilation-cover.jpg',
            }),
          ]
      trace.push({
        action: 'search',
        input: { query, type, artist },
        output: JSON.parse(JSON.stringify(items)),
      })
      return items
    },
  }
  const enrich = new EnrichMusicItemUseCase(search)
  const flow =
    variant === 'before'
      ? new Before(trackedParser, provider, enrich)
      : variant === 'pr67'
        ? new AsIs(trackedParser, new Pr67(trackedParser, provider), enrich)
        : new Contextual(new FetchPlatformMetadataUseCase(trackedParser, provider), enrich)
  // Freeze only the fallback identifier's clock, so before/after can be compared byte-for-byte.
  const now = Date.now
  Date.now = () => 1700000000000
  try {
    const result = await flow.execute(urlOverride ?? scenario.url)
    return {
      variant,
      result,
      trace,
      calls: {
        parse: trace.filter((entry) => entry.action === 'parse').length,
        platform: trace.filter((entry) => entry.action === 'platform fetch').length,
        search: trace.filter((entry) => entry.action === 'search').length,
      },
    }
  } finally {
    Date.now = now
  }
}

export async function compareScenario(id: string, url?: string) {
  const runs: Awaited<ReturnType<typeof runScenario>>[] = []
  // Sequential: each flow owns its fixture objects and its scoped clock.
  for (const variant of variants) runs.push(await runScenario(id, variant, url))
  return {
    equal: runs.every((run) => JSON.stringify(run.result) === JSON.stringify(runs[0].result)),
    runs,
  }
}
