import { type LinkParserPort } from '#application/ports/link_parser.port.js'
import { type PlatformMetadataPort } from '#application/ports/platform_metadata.port.js'
import { isLinkParseError, type LinkMetadata, type LinkMetadataError } from '#domain/link.js'

// Prototype: give the existing paste flow contextual metadata, not a new HTTP endpoint.
export class FetchPlatformMetadataUseCase {
  constructor(
    private linkParser: LinkParserPort,
    private platformMetadata: PlatformMetadataPort
  ) {}

  async execute(url: string): Promise<LinkMetadata | LinkMetadataError> {
    const parseResult = this.linkParser.parseLink(url)

    if (isLinkParseError(parseResult)) {
      return { error: parseResult.error, originalUrl: parseResult.originalUrl }
    }

    const platformMetadata = await this.platformMetadata.fetch(parseResult)

    if ('error' in platformMetadata) {
      return { error: platformMetadata.error, originalUrl: parseResult.originalUrl }
    }

    return {
      title: platformMetadata.title,
      artist: platformMetadata.artist,
      type: parseResult.type,
      thumbnailUrl: platformMetadata.thumbnailUrl,
      originalUrl: parseResult.originalUrl,
      albumName: platformMetadata.albumName,
    }
  }
}
