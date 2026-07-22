import type { ParsedLink } from '#domain/link.js'

export interface PlatformMetadata {
  title: string
  artist: string
  thumbnailUrl?: string
  albumName?: string
}

export abstract class PlatformMetadataPort {
  abstract fetch(parsedLink: ParsedLink): Promise<PlatformMetadata | { error: string }>
}
