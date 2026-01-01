import { MusicItem } from '../../domain/music_item.js'

export abstract class SearchRepository {
  abstract searchItem(query: string, type?: string): Promise<Array<MusicItem>>
}
