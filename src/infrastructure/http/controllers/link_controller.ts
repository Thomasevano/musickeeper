import type { HttpContext } from '@adonisjs/core/http'
import {
  LinkParserService,
  StreamingPlatform,
  isLinkParseError,
} from '../../services/link_parser.service.js'

export interface OEmbedResponse {
  title: string
  author_name: string
  thumbnail_url?: string
}

interface AppleMusicMetadata {
  title: string
  author_name: string
  thumbnail_url?: string
}

interface AppleMusicError {
  error: string
  status: number
}

type AppleMusicResult = AppleMusicMetadata | AppleMusicError

function isAppleMusicError(result: AppleMusicResult): result is AppleMusicError {
  return 'error' in result && 'status' in result
}

interface OEmbedError {
  error: string
  status: number
}

type OEmbedResult = OEmbedResponse | OEmbedError

function isOEmbedError(result: OEmbedResult): result is OEmbedError {
  return 'error' in result && 'status' in result
}

export default class LinkController {
  private readonly oEmbedEndpoints: Record<string, string> = {
    [StreamingPlatform.Spotify]: 'https://open.spotify.com/oembed',
    [StreamingPlatform.YouTube]: 'https://www.youtube.com/oembed',
    [StreamingPlatform.SoundCloud]: 'https://soundcloud.com/oembed',
  }

  constructor(private linkParser: LinkParserService = new LinkParserService()) {}

  async oembed({ request, response }: HttpContext) {
    const { url } = request.body()

    if (!url || typeof url !== 'string') {
      return response.status(400).json({ error: 'URL is required' })
    }

    const parseResult = this.linkParser.parseLink(url)

    if (isLinkParseError(parseResult)) {
      return response.status(400).json({ error: parseResult.error })
    }

    const { platform, originalUrl } = parseResult

    if (platform === StreamingPlatform.AppleMusic) {
      return response.status(400).json({
        error: 'Apple Music does not support oEmbed. Use /api/link/apple-music instead.',
      })
    }

    const oEmbedResult = await this.fetchOEmbed(platform, originalUrl)

    if (isOEmbedError(oEmbedResult)) {
      return response.status(oEmbedResult.status).json({ error: oEmbedResult.error })
    }

    return response.status(200).json(oEmbedResult)
  }

  private async fetchOEmbed(platform: StreamingPlatform, url: string): Promise<OEmbedResult> {
    const baseEndpoint = this.oEmbedEndpoints[platform]

    if (!baseEndpoint) {
      return { error: `oEmbed not supported for platform: ${platform}`, status: 400 }
    }

    const oEmbedUrl = new URL(baseEndpoint)
    oEmbedUrl.searchParams.set('url', url)
    oEmbedUrl.searchParams.set('format', 'json')

    try {
      const fetchResponse = await fetch(oEmbedUrl.toString())

      if (!fetchResponse.ok) {
        if (fetchResponse.status === 404) {
          return { error: 'Content not found on the streaming platform', status: 404 }
        }
        return {
          error: `Failed to fetch metadata from ${platform}`,
          status: fetchResponse.status,
        }
      }

      const data = (await fetchResponse.json()) as Record<string, unknown>

      return {
        title: String(data.title || ''),
        author_name: String(data.author_name || ''),
        thumbnail_url: data.thumbnail_url ? String(data.thumbnail_url) : undefined,
      }
    } catch (error) {
      return {
        error: `Failed to connect to ${platform} oEmbed service`,
        status: 502,
      }
    }
  }

  async appleMusic({ request, response }: HttpContext) {
    const { url } = request.body()

    if (!url || typeof url !== 'string') {
      return response.status(400).json({ error: 'URL is required' })
    }

    const parseResult = this.linkParser.parseLink(url)

    if (isLinkParseError(parseResult)) {
      return response.status(400).json({ error: parseResult.error })
    }

    const { platform, originalUrl } = parseResult

    if (platform !== StreamingPlatform.AppleMusic) {
      return response.status(400).json({
        error:
          'This endpoint only accepts Apple Music URLs. Use /api/link/oembed for other platforms.',
      })
    }

    const metadataResult = await this.fetchAppleMusicMetadata(originalUrl)

    if (isAppleMusicError(metadataResult)) {
      return response.status(metadataResult.status).json({ error: metadataResult.error })
    }

    return response.status(200).json(metadataResult)
  }

  private async fetchAppleMusicMetadata(url: string): Promise<AppleMusicResult> {
    try {
      const fetchResponse = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })

      if (!fetchResponse.ok) {
        if (fetchResponse.status === 404) {
          return { error: 'Content not found on Apple Music', status: 404 }
        }
        return {
          error: 'Failed to fetch metadata from Apple Music',
          status: fetchResponse.status,
        }
      }

      const html = await fetchResponse.text()
      return this.parseOpenGraphTags(html)
    } catch (error) {
      return {
        error: 'Failed to connect to Apple Music',
        status: 502,
      }
    }
  }

  private parseOpenGraphTags(html: string): AppleMusicResult {
    const getMetaContent = (property: string): string | undefined => {
      // Match both property="og:..." and name="og:..." patterns
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
      return { error: 'Could not extract metadata from Apple Music page', status: 422 }
    }

    // Apple Music og:title format is typically "Song Title - Artist Name"
    // or for albums "Album Title by Artist Name"
    let title = ogTitle
    let authorName = ''

    // Try to extract artist from title using common patterns
    if (ogTitle.includes(' - ')) {
      // Format: "Song Title - Artist Name"
      const parts = ogTitle.split(' - ')
      title = parts[0].trim()
      authorName = parts.slice(1).join(' - ').trim()
    } else if (ogTitle.includes(' by ')) {
      // Format: "Album Title by Artist Name"
      const byIndex = ogTitle.lastIndexOf(' by ')
      title = ogTitle.substring(0, byIndex).trim()
      authorName = ogTitle.substring(byIndex + 4).trim()
    }

    // If we couldn't extract artist from title, try og:description
    // Apple Music descriptions often contain "Song · Artist · Album" or similar
    if (!authorName && ogDescription) {
      // Try to find artist in description (often formatted as "Artist · Album · Year")
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
}
