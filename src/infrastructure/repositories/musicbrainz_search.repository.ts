import { SearchRepository } from '../../application/repositories/search.repository.js'
import { MusicItem } from '../../domain/music_item.js'

export class MusicBrainzRepository implements SearchRepository {
  async searchItem(query: string, type?: string): Promise<Array<MusicItem>> {}
}
