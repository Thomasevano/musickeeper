import { type LinkParserPort } from '#application/ports/link_parser.port.js'
import { type PlatformMetadataPort } from '#application/ports/platform_metadata.port.js'
import { isLinkParseError, type LinkMetadata, type LinkMetadataSuccess } from '#domain/link.js'
import { MusicItem, SearchType } from '#domain/music_item.js'

export type FetchPlatformMetadataError = {
  error: string
  originalUrl: string
  kind: 'validation' | 'platform'
}

export type FetchPlatformMetadataResult = LinkMetadataSuccess | FetchPlatformMetadataError

export class FetchPlatformMetadataUseCase {
  constructor(
    private linkParser: LinkParserPort,
    private platformMetadata: PlatformMetadataPort
  ) {}

  async execute(url: string): Promise<FetchPlatformMetadataResult> {
    const parsedLink = this.linkParser.parseLink(url)
    if (isLinkParseError(parsedLink)) {
      return { ...parsedLink, kind: 'validation' }
    }

    const platformMetadata = await this.platformMetadata.fetch(parsedLink)
    if ('error' in platformMetadata) {
      return {
        error: platformMetadata.error,
        originalUrl: parsedLink.originalUrl,
        kind: 'platform',
      }
    }

    const linkMetadata: LinkMetadata = {
      title: platformMetadata.title,
      artist: platformMetadata.artist,
      type: parsedLink.type,
      platform: parsedLink.platform,
      originalUrl: parsedLink.originalUrl,
      ...(platformMetadata.thumbnailUrl === undefined
        ? {}
        : { thumbnailUrl: platformMetadata.thumbnailUrl }),
      ...(platformMetadata.albumName === undefined
        ? {}
        : { albumName: platformMetadata.albumName }),
    }

    return {
      musicItem: this.createMusicItemFromLinkMetadata(linkMetadata),
      source: 'link',
      linkMetadata,
    }
  }

  private createMusicItemFromLinkMetadata(metadata: LinkMetadata): MusicItem {
    return new MusicItem({
      id: '', // The paste consumer owns the local draft identity.
      title: metadata.title || 'Unknown Title',
      releaseDate: '',
      artists: metadata.artist
        ? metadata.artist
            .split(',')
            .map((artist) => artist.trim())
            .filter(Boolean)
        : [],
      itemType: metadata.type,
      coverArt: metadata.thumbnailUrl,
      albumName:
        metadata.albumName || (metadata.type === SearchType.album ? metadata.title : undefined),
    })
  }
}
