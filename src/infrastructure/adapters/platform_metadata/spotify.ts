import type { ParsedLink } from '#domain/link.js'
import { StreamingPlatform } from '#domain/link.js'
import { SearchType } from '#domain/music_item.js'
import { getArtistNames, getMetaContent } from './html_parsing.js'
import { fetchOEmbedMetadata } from './oembed.js'
import { GOOGLEBOT_UA, type ArtistAlbumMetadata, type FetchResult } from './types.js'

const SPOTIFY_OEMBED_ENDPOINT = 'https://open.spotify.com/oembed'
const CREDIT_TIMEOUT_MS = 1_000

export async function fetchSpotifyMetadata(parsedLink: ParsedLink): Promise<FetchResult> {
  const result = await fetchOEmbedMetadata(
    StreamingPlatform.Spotify,
    SPOTIFY_OEMBED_ENDPOINT,
    parsedLink.originalUrl
  )
  if ('error' in result) return result

  const [artists, htmlMetadata] = await Promise.all([
    parsedLink.type === SearchType.track ? fetchSpotifyTrackArtists(parsedLink.id) : undefined,
    result.author_name ? undefined : fetchSpotifyHtmlMetadata(parsedLink.originalUrl),
  ])
  if (artists) result.artists = artists
  result.author_name ||= htmlMetadata?.artist || artists?.join(', ') || ''
  if (htmlMetadata) result.album_name = htmlMetadata.albumName

  return result
}

async function fetchSpotifyTrackArtists(id: string): Promise<string[] | undefined> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CREDIT_TIMEOUT_MS)

  try {
    const response = await fetch(`https://open.spotify.com/embed/track/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
    if (!response.ok) return undefined

    const html = await response.text()
    const script = html.match(/<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)
    if (!script) return undefined

    const data = JSON.parse(script[1])
    return getArtistNames(data?.props?.pageProps?.state?.data?.entity?.artists)
  } catch {
    return undefined
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchSpotifyHtmlMetadata(url: string): Promise<ArtistAlbumMetadata | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': GOOGLEBOT_UA, 'Accept': 'text/html' },
    })
    if (!response.ok) return null

    const html = await response.text()
    return parseSpotifyOgTags(html)
  } catch {
    return null
  }
}

function parseSpotifyOgTags(html: string): ArtistAlbumMetadata | null {
  const ogDescription = getMetaContent(html, 'og:description')
  if (!ogDescription) return null

  // Spotify og:description format: "Artist · Album · Song · Year" (tracks)
  //                             or "Artist · album · Year · N songs" (albums)
  const parts = ogDescription.split(' \u00B7 ').map((p) => p.trim())
  if (parts.length < 2) return null

  const artist = parts[0]
  const albumName =
    parts.length >= 3 && !['album', 'single', 'ep'].includes(parts[1].toLowerCase())
      ? parts[1]
      : undefined

  return { artist, albumName }
}
