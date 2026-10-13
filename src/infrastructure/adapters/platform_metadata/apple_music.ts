import { SearchType } from '#domain/music_item.js'
import type { ParsedLink } from '#domain/link.js'
import { decodeHtmlEntities, getArtistNames, getMetaContent } from './html_parsing.js'
import { BROWSER_UA, type FetchResult, type OEmbedMetadata } from './types.js'

const APPLE_MUSIC_SUFFIX = / on Apple Music$/i
const CREDIT_TIMEOUT_MS = 1_000
const FALLBACK_PAGE_TIMEOUT_MS = 8_000

function stripSuffix(value: string): string {
  return value.replace(APPLE_MUSIC_SUFFIX, '').trim()
}

export async function fetchAppleMusicMetadata(parsedLink: ParsedLink): Promise<FetchResult> {
  // Lookup provides localized display credits, while the page can identify each credited artist.
  const [itunesResult, creditPage] = await Promise.all([
    fetchItunesMetadata(parsedLink.id, parsedLink.type),
    fetchHtml(parsedLink.originalUrl, CREDIT_TIMEOUT_MS),
  ])
  const oEmbedResult = itunesResult ? null : await fetchOEmbed(parsedLink.originalUrl)
  // Only retry a timed-out page, and only if it is the last metadata source.
  const html =
    creditPage === null && !itunesResult && !oEmbedResult
      ? await fetchHtml(parsedLink.originalUrl, FALLBACK_PAGE_TIMEOUT_MS)
      : creditPage
  const artists =
    typeof html === 'string' ? parseAppleArtistNames(html, parsedLink.type) : undefined
  if (itunesResult) return artists ? { ...itunesResult, artists } : itunesResult

  // Fallback: oEmbed (localized — strip language-specific suffix best-effort)
  if (oEmbedResult) {
    return {
      title: stripSuffix(oEmbedResult.title),
      author_name: stripSuffix(oEmbedResult.author_name),
      thumbnail_url: oEmbedResult.thumbnail_url,
      ...(artists ? { artists } : {}),
    }
  }

  if (typeof html !== 'string') return html ?? { error: 'Apple Music page timed out' }
  const htmlResult = parseOGTags(html)
  if ('error' in htmlResult) return htmlResult

  return {
    ...htmlResult,
    title: stripSuffix(htmlResult.title),
    author_name: stripSuffix(htmlResult.author_name),
    ...(artists ? { artists } : {}),
  }
}

async function fetchItunesMetadata(id: string, type: SearchType): Promise<OEmbedMetadata | null> {
  try {
    const url = new URL('https://itunes.apple.com/lookup')
    url.searchParams.set('id', id)

    const response = await fetch(url.toString())
    if (!response.ok) return null

    const data = (await response.json()) as {
      resultCount: number
      results: Record<string, unknown>[]
    }
    if (!data.resultCount || !data.results[0]) return null

    const item = data.results[0]
    const artistName = String(item.artistName || '').trim()
    const title =
      type === SearchType.track
        ? String(item.trackName || '').trim()
        : String(item.collectionName || '').trim()
    const albumName =
      type === SearchType.track && item.collectionName
        ? String(item.collectionName).trim()
        : undefined

    if (!title || !artistName) return null

    // Replace the small thumbnail size with a larger one
    const thumbnailUrl = item.artworkUrl100
      ? String(item.artworkUrl100).replace('100x100bb', '600x600bb')
      : undefined

    return { title, author_name: artistName, thumbnail_url: thumbnailUrl, album_name: albumName }
  } catch {
    return null
  }
}

async function fetchOEmbed(url: string): Promise<OEmbedMetadata | null> {
  try {
    const oEmbedUrl = new URL('https://music.apple.com/api/oembed')
    oEmbedUrl.searchParams.set('url', url)

    const response = await fetch(oEmbedUrl.toString())
    if (!response.ok) return null

    const data = (await response.json()) as Record<string, unknown>

    return {
      title: decodeHtmlEntities(String(data.title || '')),
      author_name: decodeHtmlEntities(String(data.author_name || '')),
      thumbnail_url: data.thumbnail_url ? String(data.thumbnail_url) : undefined,
    }
  } catch {
    return null
  }
}

async function fetchHtml(
  url: string,
  timeoutMs: number
): Promise<string | { error: string } | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return { error: 'Content not found on Apple Music' }
      }
      return { error: 'Failed to fetch metadata from Apple Music' }
    }

    return await response.text()
  } catch {
    if (controller.signal.aborted) return null
    return { error: 'Failed to connect to Apple Music' }
  } finally {
    clearTimeout(timeout)
  }
}

function parseOGTags(html: string): FetchResult {
  const ogTitle = getMetaContent(html, 'og:title')
  const ogDescription = getMetaContent(html, 'og:description')
  const ogImage = getMetaContent(html, 'og:image')

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

  return { title, author_name: authorName, thumbnail_url: ogImage }
}

function parseAppleArtistNames(html: string, type: SearchType): string[] | undefined {
  const scripts = html.matchAll(
    /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )
  for (const [, script] of scripts) {
    try {
      const data = JSON.parse(script) as {
        '@type'?: string
        'byArtist'?: unknown
        'audio'?: { byArtist?: unknown }
      } | null
      const credits =
        type === SearchType.track && data?.['@type'] === 'MusicComposition'
          ? data.audio?.byArtist
          : type === SearchType.album && data?.['@type'] === 'MusicAlbum'
            ? data.byArtist
            : undefined
      const artists = getArtistNames(credits)
      if (artists) return artists
    } catch {
      // Ignore malformed JSON-LD and keep looking for the resource's artist credits.
    }
  }
  return undefined
}
