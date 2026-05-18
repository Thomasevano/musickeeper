import { MusicItem, SearchType } from '#domain/music_item.js'
import {
  isLinkParseError,
  type LinkMetadata,
  type LinkMetadataResult,
} from '#domain/link.js'
import { LinkParserPort } from '#application/ports/link_parser.port.js'
import { PlatformMetadataPort } from '#application/ports/platform_metadata.port.js'
import { EnrichMusicItemUseCase } from './enrich_music_item.use_case.js'

export class ExtractLinkMetadataUseCase {
  constructor(
    private linkParser: LinkParserPort,
    private platformMetadata: PlatformMetadataPort,
    private enrichMusicItem: EnrichMusicItemUseCase
  ) {}

  async execute(url: string): Promise<LinkMetadataResult> {
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
      const musicItem = await this.enrichMusicItem.execute(
        linkMetadata.title,
        linkMetadata.artist,
        linkMetadata.type,
        linkMetadata.albumName
      )

      if (musicItem) {
        if (linkMetadata.albumName) {
          musicItem.albumName = linkMetadata.albumName
        }

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
