import { IRecordingList, IReleaseList } from 'musicbrainz-api'
import { MusicItem, SearchType } from '../../domain/music_item.js'
import { MusicBrainzRepository } from '../repositories/musicbrainz_search.repository.js'
import { serializeMusicBrainzSearchResults } from '../serializers/musicbrainz/search_results_serializer.js'
import { coverArtArchiveApiClient } from '../providers/musicbrainz_provider.js'

export type SearchResultsSerializer = (
  searchResults: IReleaseList | IRecordingList
) => Promise<MusicItem[]>

export class MusicBrainzEnrichmentService {
  constructor(
    private repo: MusicBrainzRepository = new MusicBrainzRepository(),
    private serializeSearchResults: SearchResultsSerializer = serializeMusicBrainzSearchResults
  ) {}

  /**
   * Search MusicBrainz for a track or album and enrich cover art when the
   * recording is only linked to a compilation rather than the original album.
   */
  async enrich(
    title: string,
    artist: string,
    type: SearchType,
    albumNameHint?: string
  ): Promise<MusicItem | null> {
    const musicItem = await this.searchRecording(title, artist, type)
    if (!musicItem) return null

    // When the recording is only linked to a compilation, look up the album
    // directly to get the correct cover art. Use the primary (first) artist
    // since albums are credited to the main artist, not featured artists.
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
      // Strip feat. annotations — MusicBrainz titles don't include them
      const cleanTitle = title.replace(/\s*\(feat\..*?\)/i, '').trim()
      const searchResults = await this.repo.searchItem(cleanTitle, type, artist)
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
      const searchResults = await this.repo.searchItem(albumName, SearchType.album, artist)

      // @ts-expect-error musicbrainz-api doesn't allow union types
      const releases: IReleaseList['releases'] = searchResults.releases || []
      if (!releases.length) return null

      // Prefer the release from the same year as the track
      const releaseYear = releaseDate ? releaseDate.slice(0, 4) : null
      const sorted = [...releases].sort((a, b) => {
        const aMatch = a.date?.slice(0, 4) === releaseYear ? 0 : 1
        const bMatch = b.date?.slice(0, 4) === releaseYear ? 0 : 1
        return aMatch - bMatch
      })

      for (const release of sorted) {
        try {
          const coverArt = await coverArtArchiveApiClient.getReleaseCovers(release.id)
          if (coverArt.images?.length) {
            return coverArt.images[0].thumbnails.small
          }
        } catch {
          // No cover art for this release, try the next
        }
      }
      return null
    } catch {
      return null
    }
  }
}
