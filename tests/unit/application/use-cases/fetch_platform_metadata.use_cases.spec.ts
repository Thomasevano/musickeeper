import { test } from '@japa/runner'
import { FetchPlatformMetadataUseCase } from '#application/use-cases/fetch_platform_metadata.use_case.js'
import { LinkParserPort } from '#application/ports/link_parser.port.js'
import {
  PlatformMetadataPort,
  type PlatformMetadata,
} from '#application/ports/platform_metadata.port.js'
import { StreamingPlatform, type LinkParseResult, type ParsedLink } from '#domain/link.js'
import { SearchType } from '#domain/music_item.js'

class StubLinkParser extends LinkParserPort {
  constructor(private result: LinkParseResult) {
    super()
  }

  parseLink(): LinkParseResult {
    return this.result
  }
}

class StubPlatformMetadata extends PlatformMetadataPort {
  calls = 0

  async fetch(_parsedLink: ParsedLink): Promise<PlatformMetadata> {
    this.calls += 1
    return { title: 'Track', artist: 'Artist' }
  }
}

const spotifyLink: ParsedLink = {
  platform: StreamingPlatform.Spotify,
  type: SearchType.track,
  id: 'track-id',
  originalUrl: 'https://open.spotify.com/track/track-id',
}

const appleMusicLink: ParsedLink = {
  platform: StreamingPlatform.AppleMusic,
  type: SearchType.track,
  id: 'track-id',
  originalUrl: 'https://music.apple.com/us/song/song/track-id',
}

test.group('FetchPlatformMetadataUseCase', () => {
  test('fetches metadata for any platform without gating', async ({ assert }) => {
    const metadata = new StubPlatformMetadata()
    const useCase = new FetchPlatformMetadataUseCase(new StubLinkParser(spotifyLink), metadata)

    const result = await useCase.execute(spotifyLink.originalUrl)

    assert.deepEqual(result, { title: 'Track', artist: 'Artist' })
    assert.equal(metadata.calls, 1)
  })

  test('fetches metadata for Apple Music without gating', async ({ assert }) => {
    const metadata = new StubPlatformMetadata()
    const useCase = new FetchPlatformMetadataUseCase(new StubLinkParser(appleMusicLink), metadata)

    const result = await useCase.execute(appleMusicLink.originalUrl)

    assert.deepEqual(result, { title: 'Track', artist: 'Artist' })
    assert.equal(metadata.calls, 1)
  })

  test('returns validation error for unparseable links', async ({ assert }) => {
    const metadata = new StubPlatformMetadata()
    const parseError = { error: 'Unsupported URL', originalUrl: 'https://example.com' }
    const useCase = new FetchPlatformMetadataUseCase(new StubLinkParser(parseError), metadata)

    const result = await useCase.execute('https://example.com')

    assert.deepEqual(result, { error: 'Unsupported URL', kind: 'validation' })
    assert.equal(metadata.calls, 0)
  })
})
