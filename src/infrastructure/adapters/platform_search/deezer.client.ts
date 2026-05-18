import { SearchType } from '#domain/music_item.js'
import { matchesArtist, type PlatformSearchResult } from './match.js'

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

export class DeezerSearchClient {
  async search(
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

        const match = data.data.find((a) => matchesArtist(a.artist?.name ?? '', artists))
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

        const match = data.data.find((t) => matchesArtist(t.artist?.name ?? '', artists))
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
}
