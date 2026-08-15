import type { StreamingPlatform } from '#domain/link.js'
import { decodeHtmlEntities } from './html_parsing.js'
import type { FetchResult, OEmbedMetadata } from './types.js'

export async function fetchOEmbedMetadata(
  platform: StreamingPlatform,
  endpoint: string,
  originalUrl: string
): Promise<FetchResult> {
  const url = new URL(endpoint)
  url.searchParams.set('url', originalUrl)
  url.searchParams.set('format', 'json')

  try {
    const response = await fetch(url.toString())

    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'Content not found on the streaming platform' }
      }
      return { error: `Failed to fetch metadata from ${platform}` }
    }

    const data = (await response.json()) as Record<string, unknown>
    const result: OEmbedMetadata = {
      title: decodeHtmlEntities(String(data.title || '')),
      author_name: decodeHtmlEntities(String(data.author_name || '')),
      thumbnail_url: data.thumbnail_url ? String(data.thumbnail_url) : undefined,
    }

    return result
  } catch {
    return { error: `Failed to connect to ${platform} oEmbed service` }
  }
}
