import { SearchType } from '#domain/music_item.js'
import type { PlatformSearchResult } from './match.js'

export class BandcampSearchClient {
  async search(query: string, itemType: SearchType): Promise<PlatformSearchResult[]> {
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

      if (matches.size === 0) {
        console.warn(
          '[BandcampSearchClient] scraping yielded no results for query=%s type=%s (htmlLength=%d)',
          query,
          itemType,
          html.length
        )
        return []
      }

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
