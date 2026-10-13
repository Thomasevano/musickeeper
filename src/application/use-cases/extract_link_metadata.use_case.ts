import type { LinkParserPort } from '#application/ports/link_parser.port.js'
import type { PlatformMetadataPort } from '#application/ports/platform_metadata.port.js'
import type { SearchPort } from '#application/ports/search.port.js'
import { isLinkParseError, type LinkMetadata, type LinkParseError } from '#domain/link.js'
import { MusicItem, SearchType } from '#domain/music_item.js'

type LegacyLinkMetadata = Omit<LinkMetadata, 'platform'>
type LegacyLinkMetadataResult =
  | {
      musicItem: MusicItem
      source: 'musicbrainz' | 'link'
      linkMetadata: LegacyLinkMetadata
    }
  | LinkParseError

/** Automatic matching for tabs still running the pre-review paste flow. */
export class ExtractLinkMetadataUseCase {
  constructor(
    private linkParser: LinkParserPort,
    private platformMetadata: PlatformMetadataPort,
    private search: SearchPort
  ) {}

  async execute(url: string): Promise<LegacyLinkMetadataResult> {
    const parsedLink = this.linkParser.parseLink(url)
    if (isLinkParseError(parsedLink)) return parsedLink

    const platform = await this.platformMetadata.fetch(parsedLink)
    const { type, originalUrl } = parsedLink
    if ('error' in platform) return { error: platform.error, originalUrl }

    const { title, artist, thumbnailUrl, albumName } = platform
    const linkMetadata: LegacyLinkMetadata = {
      title,
      artist,
      type,
      originalUrl,
      thumbnailUrl,
      albumName,
    }
    const match = title && artist ? await this.findMatch(title, artist, type) : undefined

    if (match) {
      // Prefer the pasted release's art and name over a MusicBrainz compilation.
      if (thumbnailUrl) {
        match.coverArt = thumbnailUrl
      } else if (albumName && match.albumName !== albumName) {
        const primaryArtist = artist.split(',', 1)[0].trim()
        const coverArt = await this.findAlbumCoverArt(albumName, primaryArtist, match.releaseDate)
        if (coverArt) match.coverArt = coverArt
      }
      if (albumName) match.albumName = albumName
      return { musicItem: match, source: 'musicbrainz', linkMetadata }
    }

    return {
      musicItem: new MusicItem({
        // Old tabs store MusicBrainz IDs as item keys; keep unmatched keys clearly distinct.
        id: `link-${Date.now()}`,
        title: title || 'Unknown Title',
        releaseDate: '',
        artists: artist
          ? artist
              .split(',')
              .map((name) => name.trim())
              .filter(Boolean)
          : [],
        itemType: type,
        coverArt: thumbnailUrl,
        albumName: albumName || (type === SearchType.album ? title : undefined),
      }),
      source: 'link',
      linkMetadata,
    }
  }

  private async findMatch(title: string, artist: string, type: SearchType) {
    try {
      // MusicBrainz titles omit featured-artist annotations.
      const cleanTitle = title.replace(/\s*\(feat\..*?\)/i, '').trim()
      const [match] = await this.search.searchItem(cleanTitle, type, artist)
      return match
    } catch {
      return undefined
    }
  }

  private async findAlbumCoverArt(albumName: string, artist: string, releaseDate: string) {
    try {
      const releases = await this.search.searchItem(albumName, SearchType.album, artist)
      const year = releaseDate ? releaseDate.slice(0, 4) : null
      let firstCover: string | undefined
      for (const release of releases) {
        if (!release.coverArt) continue
        if (release.releaseDate?.slice(0, 4) === year) return release.coverArt
        firstCover ??= release.coverArt
      }
      return firstCover
    } catch {
      return undefined
    }
  }
}
