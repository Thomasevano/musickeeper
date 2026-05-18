import { SearchType } from '#domain/music_item.js'
import type { PlatformSearchResult } from './match.js'

export class QobuzSearchClient {
  async search(query: string, itemType: SearchType): Promise<PlatformSearchResult[]> {
    try {
      const encoded = encodeURIComponent(query)
      const searchPath = `/fr-fr/search?q=${encoded}`

      const response = await fetch(`https://www.qobuz.com${searchPath}`, {
        signal: AbortSignal.timeout(8000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html',
        },
      })
      if (!response.ok) return []

      const html = await response.text()

      if (itemType === SearchType.album) {
        const album = this.extractAlbumFromJson(html, query)
        if (album) return [album]

        const albumFromHrefs = this.extractAlbumFromHrefs(html)
        if (albumFromHrefs) return [albumFromHrefs]

        console.warn(
          '[QobuzSearchClient] album scraping yielded no results for query=%s (htmlLength=%d)',
          query,
          html.length
        )
        return []
      }

      const tracks = this.extractTracksFromHrefs(html, query)
      if (tracks.length === 0) {
        console.warn(
          '[QobuzSearchClient] track scraping yielded no results for query=%s (htmlLength=%d)',
          query,
          html.length
        )
      }
      return tracks
    } catch {
      return []
    }
  }

  private extractAlbumFromJson(html: string, query: string): PlatformSearchResult | null {
    const primaryArtist = query.split(' ')[0].toLowerCase().replace(/['']/g, '')
    const regex =
      /\\&quot;([a-z0-9]{8,})\\&quot;:\{\\&quot;id\\&quot;:\\&quot;([a-z0-9]{8,})\\&quot;,\\&quot;slug\\&quot;:\\&quot;([^&]+?)\\&quot;/g
    let match: RegExpExecArray | null
    let best: { id: string; slug: string } | null = null

    while ((match = regex.exec(html)) !== null) {
      const slug = match[3].toLowerCase().replace(/['']/g, "'")
      if (slug.includes(primaryArtist)) {
        best = { id: match[2], slug: match[3] }
        break
      }
      if (!best) {
        best = { id: match[2], slug: match[3] }
      }
    }

    if (!best) return null

    return {
      platform: 'qobuz',
      label: 'Qobuz',
      url: `https://www.qobuz.com/fr-fr/album/${best.slug}/${best.id}`,
      category: 'buy',
      confidence: 'high',
    }
  }

  private extractAlbumFromHrefs(html: string): PlatformSearchResult | null {
    const regex = /href="([^"]*\/album\/[^"]+)"/g
    let match: RegExpExecArray | null
    const candidates: string[] = []

    while ((match = regex.exec(html)) !== null) {
      const href = match[1].replace(/&amp;/g, '&')
      const full = href.startsWith('http') ? href : `https://www.qobuz.com${href}`
      const segments = full.replace(/\/+$/, '').split('/').filter(Boolean)
      const lastSegment = segments[segments.length - 1]
      if (lastSegment && /[a-z0-9]{8,}/.test(lastSegment) && !lastSegment.includes('-')) {
        candidates.push(full)
      }
    }

    if (candidates.length === 0) return null

    return {
      platform: 'qobuz',
      label: 'Qobuz',
      url: candidates[0],
      category: 'buy',
      confidence: 'high',
    }
  }

  private extractTracksFromHrefs(html: string, query: string): PlatformSearchResult[] {
    const regex = /href="([^"]*\/track\/[^"]+)"/g
    let match: RegExpExecArray | null
    const matches = new Set<string>()

    while ((match = regex.exec(html)) !== null) {
      const href = match[1].replace(/&amp;/g, '&')
      if (href) matches.add(href.startsWith('http') ? href : `https://www.qobuz.com${href}`)
    }

    if (matches.size === 0) return []

    const primaryArtist = query.split(' ')[0].toLowerCase().replace(/['']/g, '')
    const links = [...matches]
    const best = links.find((l) => l.toLowerCase().includes(primaryArtist)) ?? links[0]

    return [
      {
        platform: 'qobuz',
        label: 'Qobuz',
        url: best,
        category: 'buy',
        confidence: 'high',
      },
    ]
  }
}
