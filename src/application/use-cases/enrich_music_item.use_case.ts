import { MusicItem, SearchType } from '#domain/music_item.js'
import { SearchGateway } from '#application/ports/search.gateway.js'
import { CoverArtGateway } from '#application/ports/cover_art.gateway.js'

export class EnrichMusicItemUseCase {
  constructor(
    private search: SearchGateway,
    private coverArt: CoverArtGateway
  ) {}

  async execute(
    title: string,
    artist: string,
    type: SearchType,
    albumNameHint?: string
  ): Promise<MusicItem | null> {
    const musicItem = await this.searchRecording(title, artist, type)
    if (!musicItem) return null

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
      const cleanTitle = title.replace(/\s*\(feat\..*?\)/i, '').trim()
      const items = await this.search.searchItem(cleanTitle, type, artist)
      return items.length > 0 ? items[0] : null
    } catch {
      return null
    }
  }

  private async fetchAlbumCoverArt(
    albumName: string,
    artist: string,
    releaseDate?: string
  ): Promise<string | null> {
    try {
      const releases = await this.search.searchItem(albumName, SearchType.album, artist)
      if (!releases.length) return null

      const releaseYear = releaseDate ? releaseDate.slice(0, 4) : null
      const sorted = [...releases].sort((a, b) => {
        const aMatch = a.releaseDate?.slice(0, 4) === releaseYear ? 0 : 1
        const bMatch = b.releaseDate?.slice(0, 4) === releaseYear ? 0 : 1
        return aMatch - bMatch
      })

      for (const release of sorted) {
        const thumbnail = await this.coverArt.getThumbnailUrl(release.id)
        if (thumbnail) return thumbnail
      }
      return null
    } catch {
      return null
    }
  }
}
