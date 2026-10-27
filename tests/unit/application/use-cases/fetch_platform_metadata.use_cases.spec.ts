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

  constructor(private result: PlatformMetadata | { error: string }) {
    super()
  }

  async fetch(_parsedLink: ParsedLink): Promise<PlatformMetadata | { error: string }> {
    this.calls += 1
    return this.result
  }
}

const spotifyLink: ParsedLink = {
  platform: StreamingPlatform.Spotify,
  type: SearchType.track,
  id: 'track-id',
  originalUrl: 'https://open.spotify.com/track/track-id',
}

function resolve(metadata: PlatformMetadata, link = spotifyLink) {
  return new FetchPlatformMetadataUseCase(
    new StubLinkParser(link),
    new StubPlatformMetadata(metadata)
  ).execute(link.originalUrl)
}

test.group('FetchPlatformMetadataUseCase', () => {
  test('builds a platform-only draft from complete metadata', async ({ assert }) => {
    const result = await resolve({
      title: 'Track',
      artist: 'Artist One, Artist Two',
      thumbnailUrl: 'https://images.example/cover.jpg',
      albumName: 'Platform Album',
    })
    if ('error' in result) throw new Error(result.error)

    assert.equal(result.source, 'link')
    assert.deepEqual(
      {
        title: result.musicItem.title,
        releaseDate: result.musicItem.releaseDate,
        artists: result.musicItem.artists,
        itemType: result.musicItem.itemType,
        coverArt: result.musicItem.coverArt,
        albumName: result.musicItem.albumName,
      },
      {
        title: 'Track',
        releaseDate: '',
        artists: ['Artist One', 'Artist Two'],
        itemType: SearchType.track,
        coverArt: 'https://images.example/cover.jpg',
        albumName: 'Platform Album',
      }
    )
    assert.deepEqual(result.linkMetadata, {
      title: 'Track',
      artist: 'Artist One, Artist Two',
      type: SearchType.track,
      platform: StreamingPlatform.Spotify,
      thumbnailUrl: 'https://images.example/cover.jpg',
      originalUrl: spotifyLink.originalUrl,
      albumName: 'Platform Album',
    })
  })

  test('builds a platform-only draft from incomplete metadata', async ({ assert }) => {
    const result = await resolve({ title: '', artist: '' })
    if ('error' in result) throw new Error(result.error)

    assert.equal(result.source, 'link')
    assert.deepEqual(
      {
        title: result.musicItem.title,
        artists: result.musicItem.artists,
        itemType: result.musicItem.itemType,
        albumName: result.musicItem.albumName,
      },
      {
        title: 'Unknown Title',
        artists: [],
        itemType: SearchType.track,
        albumName: undefined,
      }
    )
    assert.deepEqual(result.linkMetadata, {
      title: '',
      artist: '',
      type: SearchType.track,
      platform: StreamingPlatform.Spotify,
      originalUrl: spotifyLink.originalUrl,
    })
  })

  test('returns a validation error without calling the platform for malformed links', async ({
    assert,
  }) => {
    const parseError = { error: 'Invalid URL format', originalUrl: 'not-a-valid-url' }
    const metadata = new StubPlatformMetadata({ title: 'Track', artist: 'Artist' })
    const useCase = new FetchPlatformMetadataUseCase(new StubLinkParser(parseError), metadata)

    const result = await useCase.execute(parseError.originalUrl)

    assert.deepEqual(result, {
      error: 'Invalid URL format',
      originalUrl: 'not-a-valid-url',
      kind: 'validation',
    })
    assert.equal(metadata.calls, 0)
  })
})
