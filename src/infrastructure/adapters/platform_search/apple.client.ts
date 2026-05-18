import { SearchType } from '#domain/music_item.js'
import { detectPlatform } from '#shared/platform_registry.js'
import { matchesArtist, type PlatformSearchResult } from './match.js'

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

export class AppleSearchClient {
  async search(
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
      if (!matchesArtist(item.artistName, artists)) continue

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
    const artistItem = data.results?.find((r) => matchesArtist(r.artistName, artists))
    if (!artistItem?.artistId) return null

    const normalizedTitle = title.toLowerCase().replace(/['']/g, "'")

    for (const item of data.results ?? []) {
      if (!matchesArtist(item.artistName, artists)) continue
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

    const lookupUrl = `https://itunes.apple.com/lookup?id=${artistItem.artistId}&entity=album`
    const lookupResponse = await fetch(lookupUrl, { signal: AbortSignal.timeout(8000) })
    if (!lookupResponse.ok) return null

    const lookupData = (await lookupResponse.json()) as AppleSearchResult
    if (!lookupData.results?.length) return null

    for (const item of lookupData.results) {
      if (item.wrapperType !== 'collection') continue
      if (!matchesArtist(item.artistName, artists)) continue
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
}
