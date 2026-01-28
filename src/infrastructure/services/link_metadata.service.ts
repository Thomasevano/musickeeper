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
}

export interface LinkMetadata {
  title: string
  artist: string
  type: SearchType
  thumbnailUrl?: string
  originalUrl: string
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

  constructor(
    private linkParser: LinkParserService = new LinkParserService(),
    private musicBrainzRepository: MusicBrainzRepository = new MusicBrainzRepository(),
    private serializeSearchResults: SearchResultsSerializer = serializeMusicBrainzSearchResults
  ) {}

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
      title: oEmbedMetadata.title,
      artist: oEmbedMetadata.author_name,
      type: parseResult.type,
      thumbnailUrl: oEmbedMetadata.thumbnail_url,
      originalUrl: parseResult.originalUrl,
    }

    // Try to enrich with MusicBrainz data
    if (linkMetadata.title && linkMetadata.artist) {
      const musicItem = await this.searchMusicBrainz(
        linkMetadata.title,
        linkMetadata.artist,
        linkMetadata.type
      )

      if (musicItem) {
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

      return {
        title: String(data.title || ''),
        author_name: String(data.author_name || ''),
        thumbnail_url: data.thumbnail_url ? String(data.thumbnail_url) : undefined,
      }
    } catch {
      return { error: `Failed to connect to ${platform} oEmbed service` }
    }
  }

  private async fetchAppleMusicMetadata(url: string): Promise<OEmbedMetadata | { error: string }> {
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

  private parseOpenGraphTags(html: string): OEmbedMetadata | { error: string } {
    const getMetaContent = (property: string): string | undefined => {
      const regex = new RegExp(
        `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
        'i'
      )
      const match = html.match(regex)
      return match ? match[1] || match[2] : undefined
    }

    const ogTitle = getMetaContent('og:title')
    const ogDescription = getMetaContent('og:description')
    const ogImage = getMetaContent('og:image')

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
      albumName: metadata.type === SearchType.album ? metadata.title : undefined,
    })
  }
}
