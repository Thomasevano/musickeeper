import { test } from '@japa/runner'
import LinkController from '#infrastructure/http/controllers/link_controller.js'
import { LinkParserAdapter } from '#infrastructure/adapters/link_parser.adapter.js'
import { PlatformMetadataAdapter } from '#infrastructure/adapters/platform_metadata.adapter.js'
import type { ExtractLinkMetadataUseCase } from '#application/use-cases/extract_link_metadata.use_case.js'
import { FetchPlatformMetadataUseCase } from '#application/use-cases/fetch_platform_metadata.use_case.js'

function makeController(): LinkController {
  const extractLinkMetadataStub = {
    execute: async () => ({ error: 'stub', originalUrl: '' }),
  } as unknown as ExtractLinkMetadataUseCase
  const parser = new LinkParserAdapter()
  const metadata = new PlatformMetadataAdapter()
  return new LinkController(
    new FetchPlatformMetadataUseCase(parser, metadata),
    extractLinkMetadataStub
  )
}

interface MockResponse {
  status: number
  body: unknown
}

function createMockContext(body: Record<string, unknown> = {}) {
  const mockResponse: MockResponse = {
    status: 200,
    body: null,
  }

  const responseChain = {
    status(code: number) {
      mockResponse.status = code
      return this
    },
    json(data: unknown) {
      mockResponse.body = data
      return mockResponse
    },
  }

  return {
    request: {
      body: () => body,
    },
    response: responseChain,
    getMockResponse: () => mockResponse,
  }
}

const originalFetch = globalThis.fetch

test.group('LinkController - platformMetadata', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns 400 when URL is missing', async ({ assert }) => {
    const controller = makeController()
    const ctx = createMockContext({})

    await controller.platformMetadata(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 400)
    assert.deepEqual(result.body, { error: 'URL is required' })
  })

  test('returns 400 when URL is not a string', async ({ assert }) => {
    const controller = makeController()
    const ctx = createMockContext({ url: 123 })

    await controller.platformMetadata(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 400)
    assert.deepEqual(result.body, { error: 'URL is required' })
  })

  test('returns 400 for invalid URL format', async ({ assert }) => {
    const controller = makeController()
    const ctx = createMockContext({ url: 'not-a-valid-url' })

    await controller.platformMetadata(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 400)
    assert.deepEqual(result.body, { error: 'Invalid URL format' })
  })

  test('returns 400 for unsupported platform', async ({ assert }) => {
    const controller = makeController()
    const ctx = createMockContext({ url: 'https://tidal.com/browse/track/12345' })

    await controller.platformMetadata(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 400)
    assert.include((result.body as { error: string }).error, 'Unsupported platform')
  })

  test('fetches Spotify metadata successfully', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Never Gonna Give You Up',
      author_name: 'Rick Astley',
      thumbnail_url: 'https://i.scdn.co/image/abc123',
    }

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      assert.include(urlString, 'open.spotify.com/oembed')

      return new Response(JSON.stringify(mockOEmbedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const controller = makeController()
    const ctx = createMockContext({
      url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
    })

    await controller.platformMetadata(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, mockOEmbedResponse)
  })

  test('fetches YouTube metadata successfully', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Never Gonna Give You Up',
      author_name: 'Rick Astley',
      thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    }

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      assert.include(urlString, 'youtube.com/oembed')

      return new Response(JSON.stringify(mockOEmbedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const controller = makeController()
    const ctx = createMockContext({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })

    await controller.platformMetadata(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, mockOEmbedResponse)
  })

  test('fetches SoundCloud metadata successfully', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Some Track',
      author_name: 'Some Artist',
      thumbnail_url: 'https://i1.sndcdn.com/artworks-abc123.jpg',
    }

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      assert.include(urlString, 'soundcloud.com/oembed')

      return new Response(JSON.stringify(mockOEmbedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const controller = makeController()
    const ctx = createMockContext({ url: 'https://soundcloud.com/artistname/track-title' })

    await controller.platformMetadata(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, mockOEmbedResponse)
  })

  test('handles 404 from platform', async ({ assert }) => {
    globalThis.fetch = async () => {
      return new Response('Not found', { status: 404 })
    }

    const controller = makeController()
    const ctx = createMockContext({
      url: 'https://open.spotify.com/track/nonexistent',
    })

    await controller.platformMetadata(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 404)
    assert.include((result.body as { error: string }).error, 'Content not found')
  })

  test('handles other error status from platform', async ({ assert }) => {
    globalThis.fetch = async () => {
      return new Response('Server error', { status: 500 })
    }

    const controller = makeController()
    const ctx = createMockContext({
      url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
    })

    await controller.platformMetadata(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 400)
    assert.include((result.body as { error: string }).error, 'Failed to fetch metadata')
  })

  test('handles network error gracefully', async ({ assert }) => {
    globalThis.fetch = async () => {
      throw new Error('Network error')
    }

    const controller = makeController()
    const ctx = createMockContext({
      url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
    })

    await controller.platformMetadata(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 502)
    assert.include((result.body as { error: string }).error, 'Failed to connect')
  })

  test('handles missing fields in response', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Some Track',
    }

    globalThis.fetch = async () => {
      return new Response(JSON.stringify(mockOEmbedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const controller = makeController()
    const ctx = createMockContext({
      url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
    })

    await controller.platformMetadata(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, {
      title: 'Some Track',
      author_name: '',
      thumbnail_url: undefined,
    })
  })

  test('fetches Apple Music metadata successfully', async ({ assert }) => {
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('itunes.apple.com/lookup')) {
        return new Response(
          JSON.stringify({
            resultCount: 1,
            results: [
              {
                trackName: 'Anti-Hero',
                artistName: 'Taylor Swift',
                collectionName: 'Midnights',
                artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/abc123/100x100bb.jpg',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const controller = makeController()
    const ctx = createMockContext({
      url: 'https://music.apple.com/us/album/midnights/1649434004?i=1649434012',
    })

    await controller.platformMetadata(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 200)
    const body = result.body as { title: string; author_name: string; album_name?: string }
    assert.equal(body.title, 'Anti-Hero')
    assert.equal(body.author_name, 'Taylor Swift')
    assert.equal(body.album_name, 'Midnights')
  })
})
