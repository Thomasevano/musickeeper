import { test } from '@japa/runner'
import { FetchAppleMusicMetadataUseCase } from '#application/use-cases/fetch_apple_music_metadata.use_case.js'
import { FetchOEmbedMetadataUseCase } from '#application/use-cases/fetch_oembed_metadata.use_case.js'
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
    return { title: 'Song', artist: 'Artist' }
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

test.group('FetchOEmbedMetadataUseCase', () => {
  test('rejects Apple Music before fetching platform metadata', async ({ assert }) => {
    const metadata = new StubPlatformMetadata()
    const useCase = new FetchOEmbedMetadataUseCase(new StubLinkParser(appleMusicLink), metadata)

    const result = await useCase.execute(appleMusicLink.originalUrl)

    assert.deepEqual(result, {
      error: 'Apple Music does not support oEmbed. Use /api/link/apple-music instead.',
      kind: 'validation',
    })
    assert.equal(metadata.calls, 0)
  })
})

test.group('FetchAppleMusicMetadataUseCase', () => {
  test('rejects other platforms before fetching platform metadata', async ({ assert }) => {
    const metadata = new StubPlatformMetadata()
    const useCase = new FetchAppleMusicMetadataUseCase(new StubLinkParser(spotifyLink), metadata)

    const result = await useCase.execute(spotifyLink.originalUrl)

    assert.deepEqual(result, {
      kind: 'validation',
      error:
        'This endpoint only accepts Apple Music URLs. Use /api/link/oembed for other platforms.',
    })
    assert.equal(metadata.calls, 0)
  })
})
