import { SearchType } from '#domain/music_item.js'
import type { ExternalLink } from '#domain/music_item.js'

export abstract class MusicBrainzExternalLinksPort {
  abstract fetchExternalLinks(mbid: string, itemType: SearchType): Promise<ExternalLink[]>
}
