import { IRecordingList, IReleaseList } from 'musicbrainz-api'
import { MusicItem, SearchType } from '#domain/music_item.js'
import { SearchGateway } from '#application/ports/search.gateway.js'
import { CoverArtGateway } from '#application/ports/cover_art.gateway.js'

export type SearchResultsSerializer = (
  searchResults: IReleaseList | IRecordingList
) => Promise<MusicItem[]>

export class EnrichMusicItemUseCase {
  constructor(
    private search: SearchGateway,
    private coverArt: CoverArtGateway,
    private serializeSearchResults: SearchResultsSerializer
  ) {}

  /**
   * Search MusicBrainz for a track or album and enrich cover art when the
   * recording is only linked to a compilation rather than the original album.
   */
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
      const searchResults = await this.search.searchItem(cleanTitle, type, artist)
      const musicItems = await this.serializeSearchResults(searchResults)
      return musicItems.length > 0 ? musicItems[0] : null
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
      const searchResults = await this.search.searchItem(albumName, SearchType.album, artist)

      // @ts-expect-error musicbrainz-api doesn't allow union types
      const releases: IReleaseList['releases'] = searchResults.releases || []
      if (!releases.length) return null

      const releaseYear = releaseDate ? releaseDate.slice(0, 4) : null
      const sorted = [...releases].sort((a, b) => {
        const aMatch = a.date?.slice(0, 4) === releaseYear ? 0 : 1
        const bMatch = b.date?.slice(0, 4) === releaseYear ? 0 : 1
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
