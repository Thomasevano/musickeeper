import { SearchType } from '../../domain/music_item.js'
import { detectPlatform, PLATFORMS } from '../../shared/platform_registry.js'
import type { ExternalLink } from '../../domain/music_item.js'

interface DeezerSearchResult {
  data?: Array<{
    id: number
    title?: string
    link: string
    type?: string
    artist?: { name: string }
    album?: { id: number; title: string }
  }>
}

interface DeezerAlbumSearchResult {
  data?: Array<{
    id: number
    title: string
    link: string
    artist?: { name: string }
  }>
}

interface AppleSearchResultItem {
  trackId?: number
  collectionId?: number
  artistId?: number
  trackName?: string
  collectionName?: string
  artistName: string
  trackViewUrl?: string
  collectionViewUrl?: string
  wrapperType: string
}

interface AppleSearchResult {
  results?: AppleSearchResultItem[]
}

interface PlatformSearchResult {
  platform: string
  label: string
  url: string
  category: 'stream' | 'buy'
  confidence: 'high' | 'medium'
}

export class PlatformSearchService {
  async search(artists: string[], title: string, itemType: SearchType): Promise<ExternalLink[]> {
    const query = `${artists.join(' ')} ${title}`
    const results: PlatformSearchResult[] = []

    const settled = await Promise.allSettled([
      this.searchDeezer(artists, title, itemType),
      this.searchApple(artists, title, itemType),
      this.searchQobuz(query, itemType),
      this.searchBandcamp(query, itemType),
    ])

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(...result.value)
      }
    }

    const seen = new Set<string>()
    const links: ExternalLink[] = []

    for (const r of results) {
      if (seen.has(r.platform)) continue
      if (!PLATFORMS.some((p) => p.id === r.platform)) continue
      const spec = PLATFORMS.find((p) => p.id === r.platform)!
      seen.add(r.platform)
      links.push({
        platform: spec.id,
        label: spec.label,
        url: r.url,
        category: spec.category,
        source: 'platform-search',
      })
    }

    return links
  }

  private matchesArtist(artistName: string, artists: string[]): boolean {
    const lower = artistName.toLowerCase()
    return artists.some((a) => lower.includes(a.toLowerCase()))
  }

  private async searchDeezer(
    artists: string[],
    title: string,
    itemType: SearchType
  ): Promise<PlatformSearchResult[]> {
    try {
      const query = `${artists.join(' ')} ${title}`
      const encoded = encodeURIComponent(query)
      const apiUrl =
        itemType === SearchType.album
          ? `https://api.deezer.com/search/album?q=${encoded}&limit=5`
          : `https://api.deezer.com/search?q=${encoded}&limit=5`

      const response = await fetch(apiUrl, { signal: AbortSignal.timeout(8000) })
      if (!response.ok) return []

      if (itemType === SearchType.album) {
        const data = (await response.json()) as DeezerAlbumSearchResult
        if (!data.data?.length) return []

        const match = data.data.find((a) => this.matchesArtist(a.artist?.name ?? '', artists))
        if (!match) return []

        return [
          {
            platform: 'deezer',
            label: 'Deezer',
            url: match.link,
            category: 'stream',
            confidence: 'high',
          },
        ]
      } else {
        const data = (await response.json()) as DeezerSearchResult
        if (!data.data?.length) return []

        const match = data.data.find((t) => this.matchesArtist(t.artist?.name ?? '', artists))
        if (!match) return []

        return [
          {
            platform: 'deezer',
            label: 'Deezer',
            url: match.link,
            category: 'stream',
            confidence: 'high',
          },
        ]
      }
    } catch {
      return []
    }
  }

  private async searchApple(
    artists: string[],
    title: string,
    itemType: SearchType
  ): Promise<PlatformSearchResult[]> {
    try {
      const result = await this.searchAppleDirect(artists, title, itemType)
      if (result) return result

      if (itemType === SearchType.album && artists.length > 0) {
        const catalogResult = await this.searchAppleCatalog(artists, title)
        if (catalogResult) return catalogResult
      }

      return []
    } catch {
      return []
    }
  }

  private async searchAppleDirect(
    artists: string[],
    title: string,
    itemType: SearchType
  ): Promise<PlatformSearchResult[] | null> {
    const query = `${artists.join(' ')} ${title}`
    const encoded = encodeURIComponent(query)
    const entity = itemType === SearchType.album ? 'album' : 'musicTrack'

    const response = await fetch(
      `https://itunes.apple.com/search?term=${encoded}&entity=${entity}&limit=10`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!response.ok) return null

    const data = (await response.json()) as AppleSearchResult
    if (!data.results?.length) return null

    for (const item of data.results) {
      if (!this.matchesArtist(item.artistName, artists)) continue

      const url = itemType === SearchType.album ? item.collectionViewUrl : item.trackViewUrl
      if (!url) continue
      if (detectPlatform(url)?.id !== 'apple-music') continue

      return [
        {
          platform: 'apple-music',
          label: 'Apple Music',
          url,
          category: 'stream',
          confidence: 'high',
        },
      ]
    }

    return null
  }

  private async searchAppleCatalog(
    artists: string[],
    title: string
  ): Promise<PlatformSearchResult[] | null> {
    const artistEncoded = encodeURIComponent(artists.join(' '))
    const searchUrl = `https://itunes.apple.com/search?term=${artistEncoded}&entity=album&limit=200`
    const response = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return null

    const data = (await response.json()) as AppleSearchResult
    const artistItem = data.results?.find((r) => this.matchesArtist(r.artistName, artists))
    if (!artistItem?.artistId) return null

    const normalizedTitle = title.toLowerCase().replace(/['']/g, "'")

    // Try matching in initial search results first
    for (const item of data.results ?? []) {
      if (!this.matchesArtist(item.artistName, artists)) continue
      const itemTitle = (item.collectionName ?? '').toLowerCase().replace(/['']/g, "'")
      if (
        item.collectionViewUrl &&
        (itemTitle.includes(normalizedTitle) || normalizedTitle.includes(itemTitle.split(' - ')[0]))
      ) {
        if (detectPlatform(item.collectionViewUrl)?.id === 'apple-music') {
          return [
            {
              platform: 'apple-music',
              label: 'Apple Music',
              url: item.collectionViewUrl,
              category: 'stream',
              confidence: 'high',
            },
          ]
        }
      }
    }

    // Fallback: iTunes Search API may not return all albums for some artists.
    // Use the Lookup API with the artist ID to get the full discography.
    const lookupUrl = `https://itunes.apple.com/lookup?id=${artistItem.artistId}&entity=album`
    const lookupResponse = await fetch(lookupUrl, { signal: AbortSignal.timeout(8000) })
    if (!lookupResponse.ok) return null

    const lookupData = (await lookupResponse.json()) as AppleSearchResult
    if (!lookupData.results?.length) return null

    for (const item of lookupData.results) {
      if (item.wrapperType !== 'collection') continue
      if (!this.matchesArtist(item.artistName, artists)) continue
      const itemTitle = (item.collectionName ?? '').toLowerCase().replace(/['']/g, "'")
      if (
        item.collectionViewUrl &&
        (itemTitle.includes(normalizedTitle) || normalizedTitle.includes(itemTitle.split(' - ')[0]))
      ) {
        if (detectPlatform(item.collectionViewUrl)?.id === 'apple-music') {
          return [
            {
              platform: 'apple-music',
              label: 'Apple Music',
              url: item.collectionViewUrl,
              category: 'stream',
              confidence: 'high',
            },
          ]
        }
      }
    }

    return null
  }

  private async searchQobuz(query: string, itemType: SearchType): Promise<PlatformSearchResult[]> {
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
        const album = this.extractQobuzAlbumFromJson(html, query)
        if (album) return [album]

        const albumFromHrefs = this.extractQobuzAlbumFromHrefs(html)
        if (albumFromHrefs) return [albumFromHrefs]

        return []
      }

      return this.extractQobuzTracksFromHrefs(html, query)
    } catch {
      return []
    }
  }

  private extractQobuzAlbumFromJson(html: string, query: string): PlatformSearchResult | null {
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

  private extractQobuzAlbumFromHrefs(html: string): PlatformSearchResult | null {
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

  private extractQobuzTracksFromHrefs(html: string, query: string): PlatformSearchResult[] {
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

  private async searchBandcamp(
    query: string,
    itemType: SearchType
  ): Promise<PlatformSearchResult[]> {
    try {
      const encoded = encodeURIComponent(query)
      const searchType = itemType === SearchType.album ? 'a' : 't'
      const response = await fetch(
        `https://bandcamp.com/search?q=${encoded}&item_type=${searchType}`,
        {
          signal: AbortSignal.timeout(8000),
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html',
          },
        }
      )
      if (!response.ok) return []

      const html = await response.text()
      const pathPrefix = itemType === SearchType.album ? '/album/' : '/track/'
      const regex = new RegExp(`href="(https?://[^"]*\\.bandcamp\\.com${pathPrefix}[^"?]+)`, 'g')
      const matches = new Set<string>()
      let match: RegExpExecArray | null

      while ((match = regex.exec(html)) !== null) {
        const url = match[1]
        const cleanUrl = url.split('?')[0]
        matches.add(cleanUrl)
      }

      if (matches.size === 0) return []

      const primaryArtist = query.split(' ')[0].toLowerCase()
      const links = [...matches]

      const best =
        links.find((l) => l.toLowerCase().includes(primaryArtist.replace(/['']/g, ''))) ?? links[0]

      return [
        {
          platform: 'bandcamp',
          label: 'Bandcamp',
          url: best,
          category: 'buy',
          confidence: 'high',
        },
      ]
    } catch {
      return []
    }
  }
}
