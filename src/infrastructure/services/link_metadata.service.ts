import { IRecordingList, IReleaseList } from 'musicbrainz-api'
import { MusicItem, SearchType } from '../../domain/music_item.js'
import {
  LinkParserService,
  StreamingPlatform,
  isLinkParseError,
  type ParsedLink,
} from './link_parser.service.js'
import { MusicBrainzRepository } from '../repositories/musicbrainz_search.repository.js'
import { serializeMusicBrainzSearchResults } from '../serializers/musicbrainz/search_results_serializer.js'

export interface OEmbedMetadata {
  title: string
  author_name: string
  thumbnail_url?: string
  album_name?: string
}

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

interface OEmbedEndpoints {
  spotify: string
  youtube: string
  soundcloud: string
}

export type SearchResultsSerializer = (
  searchResults: IReleaseList | IRecordingList
) => Promise<MusicItem[]>

export class LinkMetadataService {
  private readonly oEmbedEndpoints: OEmbedEndpoints = {
    spotify: 'https://open.spotify.com/oembed',
    youtube: 'https://www.youtube.com/oembed',
    soundcloud: 'https://soundcloud.com/oembed',
  }

  private static readonly APPLE_MUSIC_SUFFIX = / on Apple Music$/i

  constructor(
    private linkParser: LinkParserService = new LinkParserService(),
    private musicBrainzRepository: MusicBrainzRepository = new MusicBrainzRepository(),
    private serializeSearchResults: SearchResultsSerializer = serializeMusicBrainzSearchResults
  ) {}

  static stripAppleMusicSuffix(value: string): string {
    return value.replace(LinkMetadataService.APPLE_MUSIC_SUFFIX, '').trim()
  }

  async fetchMetadata(url: string): Promise<LinkMetadataResult> {
    const parseResult = this.linkParser.parseLink(url)

    if (isLinkParseError(parseResult)) {
      return { error: parseResult.error, originalUrl: parseResult.originalUrl }
    }

    const oEmbedMetadata = await this.fetchOEmbedMetadata(parseResult)

    if ('error' in oEmbedMetadata) {
      return { error: oEmbedMetadata.error, originalUrl: parseResult.originalUrl }
    }

    const linkMetadata: LinkMetadata = {
      title: LinkMetadataService.stripAppleMusicSuffix(oEmbedMetadata.title),
      artist: LinkMetadataService.stripAppleMusicSuffix(oEmbedMetadata.author_name),
      type: parseResult.type,
      thumbnailUrl: oEmbedMetadata.thumbnail_url,
      originalUrl: parseResult.originalUrl,
      albumName: oEmbedMetadata.album_name,
    }

    // Try to enrich with MusicBrainz data
    if (linkMetadata.title && linkMetadata.artist) {
      const musicItem = await this.searchMusicBrainz(
        linkMetadata.title,
        linkMetadata.artist,
        linkMetadata.type
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

        return {
          musicItem,
          source: 'musicbrainz',
          linkMetadata,
        }
      }
    }

    // Fall back to creating a MusicItem from link metadata
    const fallbackMusicItem = this.createMusicItemFromLinkMetadata(linkMetadata)

    return {
      musicItem: fallbackMusicItem,
      source: 'link',
      linkMetadata,
    }
  }

  private async fetchOEmbedMetadata(
    parsedLink: ParsedLink
  ): Promise<OEmbedMetadata | { error: string }> {
    const { platform, originalUrl } = parsedLink

    if (platform === StreamingPlatform.AppleMusic) {
      return this.fetchAppleMusicMetadata(originalUrl)
    }

    const endpointKey = platform as keyof OEmbedEndpoints
    const baseEndpoint = this.oEmbedEndpoints[endpointKey]

    if (!baseEndpoint) {
      return { error: `oEmbed not supported for platform: ${platform}` }
    }

    const oEmbedUrl = new URL(baseEndpoint)
    oEmbedUrl.searchParams.set('url', originalUrl)
    oEmbedUrl.searchParams.set('format', 'json')

    try {
      const response = await fetch(oEmbedUrl.toString())

      if (!response.ok) {
        if (response.status === 404) {
          return { error: 'Content not found on the streaming platform' }
        }
        return { error: `Failed to fetch metadata from ${platform}` }
      }

      const data = (await response.json()) as Record<string, unknown>

      const result: OEmbedMetadata = {
        title: String(data.title || ''),
        author_name: String(data.author_name || ''),
        thumbnail_url: data.thumbnail_url ? String(data.thumbnail_url) : undefined,
      }

      // Spotify oEmbed doesn't return author_name for tracks — enrich from page HTML
      if (platform === StreamingPlatform.Spotify && !result.author_name) {
        const htmlMetadata = await this.fetchSpotifyHtmlMetadata(originalUrl)
        if (htmlMetadata) {
          result.author_name = htmlMetadata.artist
          result.album_name = htmlMetadata.albumName
        }
      }

      // SoundCloud oEmbed appends " by {author}" to the title — get the clean title from HTML
      if (platform === StreamingPlatform.SoundCloud) {
        const cleanTitle = await this.fetchSoundCloudCleanTitle(originalUrl)
        if (cleanTitle) {
          result.title = cleanTitle
        }
      }

      // YouTube oEmbed returns "- Topic" suffix on auto-generated channels — get clean artist from YouTube Music HTML
      if (platform === StreamingPlatform.YouTube && result.author_name.endsWith('- Topic')) {
        const cleanArtist = await this.fetchYouTubeCleanArtist(originalUrl)
        if (cleanArtist) {
          result.author_name = cleanArtist
        }
      }

      return result
    } catch {
      return { error: `Failed to connect to ${platform} oEmbed service` }
    }
  }

  async fetchAppleMusicMetadata(url: string): Promise<OEmbedMetadata | { error: string }> {
    // Primary: use Apple Music's oEmbed API (returns clean, non-localized metadata)
    const oEmbedResult = await this.fetchAppleMusicOEmbed(url)
    if (oEmbedResult && !('error' in oEmbedResult)) {
      return oEmbedResult
    }

    // Fallback: scrape HTML Open Graph tags
    return this.fetchAppleMusicHtml(url)
  }

  private async fetchAppleMusicOEmbed(
    url: string
  ): Promise<OEmbedMetadata | { error: string } | null> {
    try {
      const oEmbedUrl = new URL('https://music.apple.com/api/oembed')
      oEmbedUrl.searchParams.set('url', url)

      const response = await fetch(oEmbedUrl.toString())

      if (!response.ok) {
        // Return null to trigger fallback instead of a hard error
        return null
      }

      const data = (await response.json()) as Record<string, unknown>

      return {
        title: String(data.title || ''),
        author_name: String(data.author_name || ''),
        thumbnail_url: data.thumbnail_url ? String(data.thumbnail_url) : undefined,
      }
    } catch {
      // oEmbed failed, return null to trigger fallback
      return null
    }
  }

  private async fetchAppleMusicHtml(url: string): Promise<OEmbedMetadata | { error: string }> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return { error: 'Content not found on Apple Music' }
        }
        return { error: 'Failed to fetch metadata from Apple Music' }
      }

      const html = await response.text()
      return this.parseOpenGraphTags(html)
    } catch {
      return { error: 'Failed to connect to Apple Music' }
    }
  }

  private async fetchSpotifyHtmlMetadata(
    url: string
  ): Promise<{ artist: string; albumName?: string } | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
          'Accept': 'text/html',
        },
      })

      if (!response.ok) return null

      const html = await response.text()
      return this.parseSpotifyOgTags(html)
    } catch {
      return null
    }
  }

  private static getMetaContent(html: string, property: string): string | undefined {
    const regex = new RegExp(
      `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
      'i'
    )
    const match = html.match(regex)
    return match ? match[1] || match[2] : undefined
  }

  private parseSpotifyOgTags(html: string): { artist: string; albumName?: string } | null {
    const ogDescription = LinkMetadataService.getMetaContent(html, 'og:description')
    if (!ogDescription) return null

    // Spotify og:description format: "Artist · Album · Song · Year" (tracks)
    //                             or "Artist · album · Year · N songs" (albums)
    const parts = ogDescription.split(' \u00B7 ').map((p) => p.trim())
    if (parts.length < 2) return null

    const artist = parts[0]
    // For tracks, second part is the album name (skip if it matches a type keyword)
    const albumName =
      parts.length >= 3 && !['album', 'single', 'ep'].includes(parts[1].toLowerCase())
        ? parts[1]
        : undefined

    return { artist, albumName }
  }

  private async fetchSoundCloudCleanTitle(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html',
        },
      })

      if (!response.ok) return null

      const html = await response.text()
      return LinkMetadataService.getMetaContent(html, 'og:title') || null
    } catch {
      return null
    }
  }

  private async fetchYouTubeCleanArtist(originalUrl: string): Promise<string | null> {
    try {
      // Convert any youtube.com URL to music.youtube.com for consistent og:description
      const url = new URL(originalUrl)
      url.hostname = 'music.youtube.com'

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html',
        },
      })

      if (!response.ok) return null

      const html = await response.text()
      const ogDescription = LinkMetadataService.getMetaContent(html, 'og:description')
      return ogDescription?.trim() || null
    } catch {
      return null
    }
  }

  private parseOpenGraphTags(html: string): OEmbedMetadata | { error: string } {
    const ogTitle = LinkMetadataService.getMetaContent(html, 'og:title')
    const ogDescription = LinkMetadataService.getMetaContent(html, 'og:description')
    const ogImage = LinkMetadataService.getMetaContent(html, 'og:image')

    if (!ogTitle) {
      return { error: 'Could not extract metadata from Apple Music page' }
    }

    let title = ogTitle
    let authorName = ''

    if (ogTitle.includes(' - ')) {
      const parts = ogTitle.split(' - ')
      title = parts[0].trim()
      authorName = parts.slice(1).join(' - ').trim()
    } else if (ogTitle.includes(' by ')) {
      const byIndex = ogTitle.lastIndexOf(' by ')
      title = ogTitle.substring(0, byIndex).trim()
      authorName = ogTitle.substring(byIndex + 4).trim()
    }

    if (!authorName && ogDescription) {
      const descParts = ogDescription.split(' · ')
      if (descParts.length >= 1) {
        authorName = descParts[0].trim()
      }
    }

    return {
      title,
      author_name: authorName,
      thumbnail_url: ogImage,
    }
  }

  private async searchMusicBrainz(
    title: string,
    artist: string,
    type: SearchType
  ): Promise<MusicItem | null> {
    try {
      const searchResults = await this.musicBrainzRepository.searchItem(title, type, artist)

      const musicItems = await this.serializeSearchResults(searchResults)

      if (musicItems.length > 0) {
        return musicItems[0]
      }

      return null
    } catch {
      // If MusicBrainz search fails, return null to fall back to link metadata
      return null
    }
  }

  private createMusicItemFromLinkMetadata(metadata: LinkMetadata): MusicItem {
    return new MusicItem({
      id: `link-${Date.now()}`,
      title: metadata.title || 'Unknown Title',
      releaseDate: '',
      artists: metadata.artist ? [metadata.artist] : [],
      itemType: metadata.type,
      coverArt: metadata.thumbnailUrl,
      albumName:
        metadata.albumName || (metadata.type === SearchType.album ? metadata.title : undefined),
    })
  }
}
