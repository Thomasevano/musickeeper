import type { ParsedLink } from '#domain/link.js'
import { StreamingPlatform } from '#domain/link.js'
import { getMetaContent } from './html_parsing.js'
import { fetchOEmbedMetadata } from './oembed.js'
import { BROWSER_UA, GOOGLEBOT_UA, type ArtistAlbumMetadata, type FetchResult } from './types.js'

const YOUTUBE_OEMBED_ENDPOINT = 'https://www.youtube.com/oembed'

export async function fetchYouTubeMetadata(parsedLink: ParsedLink): Promise<FetchResult> {
  if (parsedLink.originalUrl.includes('/playlist?')) {
    return fetchYouTubeMusicPlaylistMetadata(parsedLink.originalUrl)
  }

  const result = await fetchOEmbedMetadata(
    StreamingPlatform.YouTube,
    YOUTUBE_OEMBED_ENDPOINT,
    parsedLink.originalUrl
  )
  if ('error' in result || !result.author_name.endsWith('- Topic')) return result

  const htmlMetadata = await fetchYouTubeHtmlMetadata(parsedLink.originalUrl)
  if (htmlMetadata) {
    result.author_name = htmlMetadata.artist
    result.album_name = htmlMetadata.albumName
  }

  return result
}

async function fetchYouTubeHtmlMetadata(originalUrl: string): Promise<ArtistAlbumMetadata | null> {
  try {
    const url = new URL(originalUrl)
    url.hostname = 'www.youtube.com'

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': BROWSER_UA, 'Accept': 'text/html' },
    })
    if (!response.ok) return null

    const html = await response.text()
    return parseYouTubeDescription(html)
  } catch {
    return null
  }
}

async function fetchYouTubeMusicPlaylistMetadata(url: string): Promise<FetchResult> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': GOOGLEBOT_UA, 'Accept': 'text/html' },
    })

    if (!response.ok) {
      if (response.status === 404) return { error: 'Content not found on YouTube Music' }
      return { error: 'Failed to fetch metadata from YouTube Music' }
    }

    const html = await response.text()
    return parsePlaylistOGTags(html)
  } catch {
    return { error: 'Failed to connect to YouTube Music' }
  }
}

function parsePlaylistOGTags(html: string): FetchResult {
  const ogTitle = getMetaContent(html, 'og:title')
  const ogImage = getMetaContent(html, 'og:image')

  if (!ogTitle) {
    return { error: 'Could not extract metadata from YouTube Music' }
  }

  // Normalize non-breaking spaces (\u00a0) to regular spaces before parsing
  const normalizedTitle = ogTitle.replace(/\u00a0/g, ' ')

  // og:title format: "{Album} - Album by/de/von/di {Artist}" (localized)
  const dashIdx = normalizedTitle.lastIndexOf(' - ')
  let title = normalizedTitle
  let artist = ''

  if (dashIdx !== -1) {
    const beforeDash = normalizedTitle.substring(0, dashIdx).trim()
    const afterDash = normalizedTitle.substring(dashIdx + 3).trim()

    const artistMatch = afterDash.match(/^[ÁA]lbum \S+ (.+)$/i)
    if (artistMatch) {
      title = beforeDash
      artist = artistMatch[1].trim()
    }
  }

  return { title, author_name: artist, thumbnail_url: ogImage }
}

function parseYouTubeDescription(html: string): ArtistAlbumMetadata | null {
  const match = html.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});/)
  if (!match) {
    const ogDescription = getMetaContent(html, 'og:description')
    return ogDescription ? { artist: ogDescription.trim() } : null
  }

  try {
    const data = JSON.parse(match[1]) as { videoDetails?: { shortDescription?: string } }
    const description = data?.videoDetails?.shortDescription
    if (!description) return null

    // Auto-generated music videos have this format:
    // "Provided to YouTube by {label}\n\n{title} · {artist}\n\n{album}\n\n℗ ..."
    const lines = description.split('\n').filter((l) => l.trim())

    if (!lines[0]?.startsWith('Provided to YouTube')) {
      const ogDescription = getMetaContent(html, 'og:description')
      return ogDescription ? { artist: ogDescription.trim() } : null
    }

    // Line 2: "{title} · {artist1} · {artist2} · ..."
    const titleArtistLine = lines[1]
    if (!titleArtistLine?.includes(' \u00B7 ')) return null

    const artist = titleArtistLine.split(' \u00B7 ').slice(1).join(', ').trim()

    // Line 3: "{album}"
    const albumLine = lines[2]
    const albumName = albumLine && !albumLine.startsWith('\u2117') ? albumLine.trim() : undefined

    return { artist, albumName }
  } catch {
    return null
  }
}
