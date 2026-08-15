import type { ParsedLink } from '#domain/link.js'
import { StreamingPlatform } from '#domain/link.js'
import { getMetaContent } from './html_parsing.js'
import { fetchOEmbedMetadata } from './oembed.js'
import { GOOGLEBOT_UA, type ArtistAlbumMetadata, type FetchResult } from './types.js'

const SPOTIFY_OEMBED_ENDPOINT = 'https://open.spotify.com/oembed'

export async function fetchSpotifyMetadata(parsedLink: ParsedLink): Promise<FetchResult> {
  const result = await fetchOEmbedMetadata(
    StreamingPlatform.Spotify,
    SPOTIFY_OEMBED_ENDPOINT,
    parsedLink.originalUrl
  )
  if ('error' in result || result.author_name) return result

  const htmlMetadata = await fetchSpotifyHtmlMetadata(parsedLink.originalUrl)
  if (htmlMetadata) {
    result.author_name = htmlMetadata.artist
    result.album_name = htmlMetadata.albumName
  }

  return result
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
