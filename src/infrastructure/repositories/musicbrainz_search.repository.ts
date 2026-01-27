import { IRecordingList, IReleaseList } from 'musicbrainz-api'
import { SearchRepository } from '../../application/repositories/search.repository.js'
import { musicbrainzApi } from '../providers/musicbrainz_provider.js'
import { SearchType } from '../../domain/music_item.js'

export class MusicBrainzRepository implements SearchRepository {
  async searchItem(
    query: string,
    type: SearchType,
    artist?: string
  ): Promise<IRecordingList | IReleaseList> {
    let response
    const limit = 10

    let searchQuery = ''
    const isArtistOnly = artist && artist.trim() !== ''
    const isTitleAndArtist = query && query.trim() !== '' && artist && artist.trim() !== ''

    if (isTitleAndArtist) {
      if (type === 'album') {
        searchQuery = `release:"${query}" AND artist:"${artist}"`
        response = await musicbrainzApi.search('release', { query: searchQuery, limit })
      } else {
        searchQuery = `recording:"${query}" AND artist:"${artist}"`
        response = await musicbrainzApi.search('recording', { query: searchQuery, limit })
      }
    } else if (isArtistOnly) {
      searchQuery = `artist:"${artist}"`
      if (type === 'album') {
        response = await musicbrainzApi.search('release', { query: searchQuery, limit })
      } else {
        response = await musicbrainzApi.search('recording', { query: searchQuery, limit })
      }
    } else {
      searchQuery = query
      if (type === 'album') {
        response = await musicbrainzApi.search('release', { query: searchQuery, limit })
      } else {
        response = await musicbrainzApi.search('recording', { query: searchQuery, limit })
      }
    }

    return response
  }
}
