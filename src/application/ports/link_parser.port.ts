import type { LinkParseResult } from '#domain/link.js'

export abstract class LinkParserPort {
  abstract parseLink(url: string): LinkParseResult
}
