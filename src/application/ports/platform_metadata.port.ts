import type { ParsedLink } from '#domain/link.js'

export interface OEmbedMetadata {
  title: string
  author_name: string
  thumbnail_url?: string
  album_name?: string
}

export abstract class PlatformMetadataPort {
  abstract fetch(parsedLink: ParsedLink): Promise<OEmbedMetadata | { error: string }>
  abstract fetchAppleMusicMetadata(
    parsedLink: ParsedLink
  ): Promise<OEmbedMetadata | { error: string }>
}
