import { MusicItem, SearchType } from '../../domain/music_item.js'
import { LinkParserService, isLinkParseError } from './link_parser.service.js'
import { PlatformMetadataService, type OEmbedMetadata } from './platform_metadata.service.js'
import { MusicBrainzEnrichmentService } from './musicbrainz_enrichment.service.js'

export type { OEmbedMetadata }

export interface LinkMetadata {
  title: string
  artist: string
  type: SearchType
  thumbnailUrl?: string
  originalUrl: string
  albumName?: string
}

export interface LinkMetadataSuccess {
  musicItem: MusicItem
  source: 'musicbrainz' | 'link'
  linkMetadata: LinkMetadata
}

export interface LinkMetadataError {
  error: string
  originalUrl: string
}

export type LinkMetadataResult = LinkMetadataSuccess | LinkMetadataError

export function isLinkMetadataError(result: LinkMetadataResult): result is LinkMetadataError {
  return 'error' in result
}

export class LinkMetadataService {
  constructor(
    private linkParser: LinkParserService = new LinkParserService(),
    private platformMetadata: PlatformMetadataService = new PlatformMetadataService(),
    private musicBrainzEnrichment: MusicBrainzEnrichmentService = new MusicBrainzEnrichmentService()
  ) {}

  async fetchMetadata(url: string): Promise<LinkMetadataResult> {
    const parseResult = this.linkParser.parseLink(url)

    if (isLinkParseError(parseResult)) {
      return { error: parseResult.error, originalUrl: parseResult.originalUrl }
    }

    const oEmbedMetadata = await this.platformMetadata.fetch(parseResult)

    if ('error' in oEmbedMetadata) {
      return { error: oEmbedMetadata.error, originalUrl: parseResult.originalUrl }
    }

    const linkMetadata: LinkMetadata = {
      title: oEmbedMetadata.title,
      artist: oEmbedMetadata.author_name,
      type: parseResult.type,
      thumbnailUrl: oEmbedMetadata.thumbnail_url,
      originalUrl: parseResult.originalUrl,
      albumName: oEmbedMetadata.album_name,
    }

    if (linkMetadata.title && linkMetadata.artist) {
      const musicItem = await this.musicBrainzEnrichment.enrich(
        linkMetadata.title,
        linkMetadata.artist,
        linkMetadata.type,
        linkMetadata.albumName
      )

      if (musicItem) {
        // Prefer album name from the streaming platform over MusicBrainz
        // (MusicBrainz may match a compilation instead of the original album)
        if (linkMetadata.albumName) {
          musicItem.albumName = linkMetadata.albumName
        }

        // Use streaming platform cover art when MusicBrainz has none
        if (
          linkMetadata.thumbnailUrl &&
          (!musicItem.coverArt || musicItem.coverArt.includes('Blank_album'))
        ) {
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
