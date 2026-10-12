import { MusicItem, SearchType } from '#domain/music_item.js'
import { type LinkMetadata, type LinkMetadataResult } from '#domain/link.js'
import { type FetchPlatformMetadataUseCase } from './fetch_platform_metadata.use_case.js'
import { type EnrichMusicItemUseCase } from './enrich_music_item.use_case.js'

export class ExtractLinkMetadataUseCase {
  constructor(
    private fetchPlatformMetadata: FetchPlatformMetadataUseCase,
    private enrichMusicItem: EnrichMusicItemUseCase
  ) {}

  async execute(url: string): Promise<LinkMetadataResult> {
    const linkMetadata = await this.fetchPlatformMetadata.execute(url)
    if ('error' in linkMetadata) return linkMetadata

    if (linkMetadata.title && linkMetadata.artist) {
      const musicItem = await this.enrichMusicItem.execute(
        linkMetadata.title,
        linkMetadata.artist,
        linkMetadata.type,
        // The hint only makes the enricher search again for better cover art.
        // Platform artwork overwrites that result below, so passing the hint
        // when we already have a thumbnail buys a round trip and nothing else.
        linkMetadata.thumbnailUrl ? undefined : linkMetadata.albumName
      )

      if (musicItem) {
        // Platform album names are more precise when MusicBrainz matches a compilation.
        if (linkMetadata.albumName) {
          musicItem.albumName = linkMetadata.albumName
        }

        // Prefer artwork supplied by the platform the user pasted.
        if (linkMetadata.thumbnailUrl) {
          musicItem.coverArt = linkMetadata.thumbnailUrl
        }

        return { musicItem, source: 'musicbrainz', linkMetadata }
      }
    }

    return {
      musicItem: this.createMusicItemFromLinkMetadata(linkMetadata),
      source: 'link',
      linkMetadata,
    }
  }

  private createMusicItemFromLinkMetadata(metadata: LinkMetadata): MusicItem {
    return new MusicItem({
      id: `link-${Date.now()}`,
      title: metadata.title || 'Unknown Title',
      releaseDate: '',
      artists: metadata.artist
        ? metadata.artist
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean)
        : [],
      itemType: metadata.type,
      coverArt: metadata.thumbnailUrl,
      albumName:
        metadata.albumName || (metadata.type === SearchType.album ? metadata.title : undefined),
    })
  }
}
