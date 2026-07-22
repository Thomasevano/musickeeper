import { LinkParserPort } from '#application/ports/link_parser.port.js'
import {
  PlatformMetadataPort,
  type PlatformMetadata,
} from '#application/ports/platform_metadata.port.js'
import { StreamingPlatform, isLinkParseError } from '#domain/link.js'

export type FetchAppleMusicMetadataResult =
  | PlatformMetadata
  | { error: string; kind: 'validation' | 'platform' }

export class FetchAppleMusicMetadataUseCase {
  constructor(
    private linkParser: LinkParserPort,
    private platformMetadata: PlatformMetadataPort
  ) {}

  async execute(url: string): Promise<FetchAppleMusicMetadataResult> {
    const parsedLink = this.linkParser.parseLink(url)
    if (isLinkParseError(parsedLink)) {
      return { error: parsedLink.error, kind: 'validation' }
    }

    if (parsedLink.platform !== StreamingPlatform.AppleMusic) {
      return {
        error:
          'This endpoint only accepts Apple Music URLs. Use /api/link/oembed for other platforms.',
        kind: 'validation',
      }
    }

    const result = await this.platformMetadata.fetch(parsedLink)
    return 'error' in result ? { ...result, kind: 'platform' } : result
  }
}
