import { SearchPort, type SearchArtistFilter } from '#application/ports/search.port.js'
import { musicbrainzApi } from './musicbrainz_client.js'
import { type MusicItem, SearchType } from '#domain/music_item.js'
import { serializeMusicBrainzSearchResults } from '#infrastructure/serializers/musicbrainz/search_results_serializer.js'

function phrase(value: string): string {
  return `"${value.replace(/["\\]/g, '\\$&')}"`
}

export class MusicBrainzSearchAdapter extends SearchPort {
  async searchItem(
    query: string,
    type: SearchType,
    artist?: SearchArtistFilter
  ): Promise<MusicItem[]> {
    const titleField = type === SearchType.album ? 'release' : 'recording'
    const artistQuery =
      typeof artist === 'string'
        ? artist.trim() && `artist:${phrase(artist)}`
        : artist?.map((credit) => `artistname:${phrase(credit)}`).join(' AND ')
    const searchQuery =
      artistQuery && query.trim()
        ? `${titleField}:${phrase(query)} AND ${artistQuery}`
        : artistQuery || query

    const options = { query: searchQuery, limit: 10 }
    const response =
      titleField === 'release'
        ? await musicbrainzApi.search('release', options)
        : await musicbrainzApi.search('recording', options)

    return serializeMusicBrainzSearchResults(response)
  }
}
