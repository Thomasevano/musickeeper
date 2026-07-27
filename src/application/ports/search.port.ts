import { type MusicItem, type SearchType } from '#domain/music_item.js'

export abstract class SearchPort {
  abstract searchItem(query: string, type: SearchType, artist?: string): Promise<MusicItem[]>
}
