import { IRecordingList, IReleaseList } from 'musicbrainz-api'
import { SearchRepository } from '../../application/repositories/search.repository.js'
import { musicbrainzApi } from '../providers/musicbrainz_provider.js'
import { SearchType } from '../../domain/music_item.js'

export class MusicBrainzRepository implements SearchRepository {
  async searchItem(query: string, type: SearchType): Promise<IRecordingList | IReleaseList> {
    let response
    const limit = 10
    if (type === 'track') {
      response = await musicbrainzApi.search('recording', { query, limit })
    } else {
      response = await musicbrainzApi.search('release', { query, limit })
    }
    return response
  }
}
