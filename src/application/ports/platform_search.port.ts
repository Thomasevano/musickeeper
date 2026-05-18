import type { ExternalLink, SearchType } from '#domain/music_item.js'

export abstract class PlatformSearchPort {
  abstract search(
    artists: string[],
    title: string,
    itemType: SearchType
  ): Promise<ExternalLink[]>
}
