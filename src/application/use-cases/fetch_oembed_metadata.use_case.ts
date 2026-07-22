import { LinkParserPort } from '#application/ports/link_parser.port.js'
import {
  PlatformMetadataPort,
  type PlatformMetadata,
} from '#application/ports/platform_metadata.port.js'
import { StreamingPlatform, isLinkParseError } from '#domain/link.js'

export type FetchOEmbedMetadataResult =
  | PlatformMetadata
  | { error: string; kind: 'validation' | 'platform' }

export class FetchOEmbedMetadataUseCase {
  constructor(
    private linkParser: LinkParserPort,
    private platformMetadata: PlatformMetadataPort
  ) {}

  async execute(url: string): Promise<FetchOEmbedMetadataResult> {
    const parsedLink = this.linkParser.parseLink(url)
    if (isLinkParseError(parsedLink)) {
      return { error: parsedLink.error, kind: 'validation' }
    }

    if (parsedLink.platform === StreamingPlatform.AppleMusic) {
      return {
        error: 'Apple Music does not support oEmbed. Use /api/link/apple-music instead.',
        kind: 'validation',
      }
    }

    const result = await this.platformMetadata.fetch(parsedLink)
    return 'error' in result ? { ...result, kind: 'platform' } : result
  }
}
