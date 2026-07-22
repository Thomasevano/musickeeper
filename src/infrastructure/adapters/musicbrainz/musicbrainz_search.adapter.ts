import { SearchPort } from '#application/ports/search.port.js'
import { musicbrainzApi } from './musicbrainz_client.js'
import { MusicItem, SearchType } from '#domain/music_item.js'
import { serializeMusicBrainzSearchResults } from '#infrastructure/serializers/musicbrainz/search_results_serializer.js'

export class MusicBrainzSearchAdapter extends SearchPort {
  async searchItem(query: string, type: SearchType, artist?: string): Promise<MusicItem[]> {
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

    return serializeMusicBrainzSearchResults(response)
  }
}
