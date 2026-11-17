import { type MusicItem, type SearchType } from '#domain/music_item.js'

/** A live-search artist filter or the individual credits from explicit matching. */
export type SearchArtistFilter = string | readonly string[]

export abstract class SearchPort {
  abstract searchItem(
    query: string,
    type: SearchType,
    artist?: SearchArtistFilter
  ): Promise<MusicItem[]>
}
