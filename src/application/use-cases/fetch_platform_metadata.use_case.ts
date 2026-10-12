import { type LinkParserPort } from '#application/ports/link_parser.port.js'
import {
  type PlatformMetadataPort,
  type PlatformMetadata,
} from '#application/ports/platform_metadata.port.js'
import { isLinkParseError } from '#domain/link.js'

export type FetchPlatformMetadataResult =
  | PlatformMetadata
  | { error: string; kind: 'validation' | 'platform' }

export class FetchPlatformMetadataUseCase {
  constructor(
    private linkParser: LinkParserPort,
    private platformMetadata: PlatformMetadataPort
  ) {}

  async execute(url: string): Promise<FetchPlatformMetadataResult> {
    const parsedLink = this.linkParser.parseLink(url)
    if (isLinkParseError(parsedLink)) {
      return { error: parsedLink.error, kind: 'validation' }
    }

    const result = await this.platformMetadata.fetch(parsedLink)
    return 'error' in result ? { ...result, kind: 'platform' } : result
  }
}
