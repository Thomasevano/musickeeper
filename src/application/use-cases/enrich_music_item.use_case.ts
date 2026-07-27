import { type MusicItem, SearchType } from '#domain/music_item.js'
import { type SearchPort } from '#application/ports/search.port.js'

export class EnrichMusicItemUseCase {
  constructor(private search: SearchPort) {}

  async execute(
    title: string,
    artist: string,
    type: SearchType,
    albumNameHint?: string
  ): Promise<MusicItem | null> {
    const musicItem = await this.searchRecording(title, artist, type)
    if (!musicItem) return null

    // A recording may point at a compilation. Prefer the platform's album hint
    // and use the primary artist because albums omit featured-artist credits.
    if (albumNameHint && musicItem.albumName !== albumNameHint) {
      const primaryArtist = artist.split(',')[0].trim()
      const coverArt = await this.fetchAlbumCoverArt(
        albumNameHint,
        primaryArtist,
        musicItem.releaseDate
      )
      if (coverArt) {
        musicItem.coverArt = coverArt
      }
    }

    return musicItem
  }

  private async searchRecording(
    title: string,
    artist: string,
    type: SearchType
  ): Promise<MusicItem | null> {
    try {
      // MusicBrainz titles omit featured-artist annotations.
      const cleanTitle = title.replace(/\s*\(feat\..*?\)/i, '').trim()
      const items = await this.search.searchItem(cleanTitle, type, artist)
      return items.length > 0 ? items[0] : null
    } catch {
      return null
    }
  }

  /** Pick the closest matching album cover already returned by search. */
  private async fetchAlbumCoverArt(
    albumName: string,
    artist: string,
    releaseDate?: string
  ): Promise<string | undefined> {
    try {
      const releases = await this.search.searchItem(albumName, SearchType.album, artist)
      if (!releases.length) return undefined

      // Prefer artwork from a release in the recording's release year.
      const releaseYear = releaseDate ? releaseDate.slice(0, 4) : null
      const sorted = [...releases].sort((a, b) => {
        const aMatch = a.releaseDate?.slice(0, 4) === releaseYear ? 0 : 1
        const bMatch = b.releaseDate?.slice(0, 4) === releaseYear ? 0 : 1
        return aMatch - bMatch
      })

      return sorted.find((release) => release.coverArt)?.coverArt
    } catch {
      return undefined
    }
  }
}
