import type { ParsedLink } from '#domain/link.js'
import { StreamingPlatform } from '#domain/link.js'
import { getMetaContent } from './html_parsing.js'
import { fetchOEmbedMetadata } from './oembed.js'
import { BROWSER_UA, type FetchResult } from './types.js'

const SOUNDCLOUD_OEMBED_ENDPOINT = 'https://soundcloud.com/oembed'

export async function fetchSoundCloudMetadata(parsedLink: ParsedLink): Promise<FetchResult> {
  const result = await fetchOEmbedMetadata(
    StreamingPlatform.SoundCloud,
    SOUNDCLOUD_OEMBED_ENDPOINT,
    parsedLink.originalUrl
  )
  if ('error' in result) return result

  const cleanTitle = await fetchSoundCloudCleanTitle(parsedLink.originalUrl)
  if (cleanTitle) result.title = cleanTitle

  return result
}

async function fetchSoundCloudCleanTitle(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': BROWSER_UA, 'Accept': 'text/html' },
    })
    if (!response.ok) return null

    const html = await response.text()
    return getMetaContent(html, 'og:title') || null
  } catch {
    return null
  }
}
