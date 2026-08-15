import { SearchType } from '#domain/music_item.js'
import type { ParsedLink } from '#domain/link.js'
import { getMetaContent, decodeHtmlEntities } from './html_parsing.js'
import { BROWSER_UA, type FetchResult, type OEmbedMetadata } from './types.js'

const APPLE_MUSIC_SUFFIX = / on Apple Music$/i

function stripSuffix(value: string): string {
  return value.replace(APPLE_MUSIC_SUFFIX, '').trim()
}

export async function fetchAppleMusicMetadata(parsedLink: ParsedLink): Promise<FetchResult> {
  // iTunes Lookup API returns structured data — language-independent, includes album name
  const itunesResult = await fetchItunesMetadata(parsedLink.id, parsedLink.type)
  if (itunesResult) return itunesResult

  // Fallback: oEmbed (localized — strip language-specific suffix best-effort)
  const oEmbedResult = await fetchOEmbed(parsedLink.originalUrl)
  if (oEmbedResult && !('error' in oEmbedResult)) {
    return {
      title: stripSuffix(oEmbedResult.title),
      author_name: stripSuffix(oEmbedResult.author_name),
      thumbnail_url: oEmbedResult.thumbnail_url,
    }
  }

  // Last fallback: scrape HTML Open Graph tags
  const htmlResult = await fetchHtml(parsedLink.originalUrl)
  if ('error' in htmlResult) return htmlResult

  return {
    title: stripSuffix(htmlResult.title),
    author_name: stripSuffix(htmlResult.author_name),
    thumbnail_url: htmlResult.thumbnail_url,
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

async function fetchOEmbed(url: string): Promise<OEmbedMetadata | { error: string } | null> {
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

async function fetchHtml(url: string): Promise<FetchResult> {
  try {
    const response = await fetch(url, {
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

    const html = await response.text()
    return parseOGTags(html)
  } catch {
    return { error: 'Failed to connect to Apple Music' }
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
