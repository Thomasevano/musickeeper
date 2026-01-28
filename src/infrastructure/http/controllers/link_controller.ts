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
}
