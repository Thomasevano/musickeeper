import { test } from '@japa/runner'
import LinkController from '../../../src/infrastructure/http/controllers/link_controller.js'

interface MockResponse {
  status: number
  body: unknown
}

// Mock HttpContext factory
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

// Store original fetch
const originalFetch = globalThis.fetch

test.group('LinkController - oembed', (group) => {
  group.each.teardown(() => {
    // Restore original fetch after each test
    globalThis.fetch = originalFetch
  })

  test('returns 400 when URL is missing', async ({ assert }) => {
    const controller = new LinkController()
    const ctx = createMockContext({})

    await controller.oembed(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 400)
    assert.deepEqual(result.body, { error: 'URL is required' })
  })

  test('returns 400 when URL is not a string', async ({ assert }) => {
    const controller = new LinkController()
    const ctx = createMockContext({ url: 123 })

    await controller.oembed(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 400)
    assert.deepEqual(result.body, { error: 'URL is required' })
  })

  test('returns 400 for invalid URL format', async ({ assert }) => {
    const controller = new LinkController()
    const ctx = createMockContext({ url: 'not-a-valid-url' })

    await controller.oembed(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 400)
    assert.deepEqual(result.body, { error: 'Invalid URL format' })
  })

  test('returns 400 for unsupported platform', async ({ assert }) => {
    const controller = new LinkController()
    const ctx = createMockContext({ url: 'https://tidal.com/browse/track/12345' })

    await controller.oembed(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 400)
    assert.include((result.body as { error: string }).error, 'Unsupported platform')
  })

  test('returns 400 for Apple Music URL with redirect message', async ({ assert }) => {
    const controller = new LinkController()
    const ctx = createMockContext({ url: 'https://music.apple.com/us/album/midnights/1649434004' })

    await controller.oembed(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 400)
    assert.include((result.body as { error: string }).error, 'Apple Music does not support oEmbed')
  })

  test('fetches Spotify oEmbed successfully', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Never Gonna Give You Up',
      author_name: 'Rick Astley',
      thumbnail_url: 'https://i.scdn.co/image/abc123',
    }

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      assert.include(urlString, 'open.spotify.com/oembed')
      assert.include(urlString, 'url=')

      return new Response(JSON.stringify(mockOEmbedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const controller = new LinkController()
    const ctx = createMockContext({
      url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
    })

    await controller.oembed(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, mockOEmbedResponse)
  })

  test('fetches YouTube oEmbed successfully', async ({ assert }) => {
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

    const controller = new LinkController()
    const ctx = createMockContext({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })

    await controller.oembed(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, mockOEmbedResponse)
  })

  test('fetches SoundCloud oEmbed successfully', async ({ assert }) => {
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

    const controller = new LinkController()
    const ctx = createMockContext({ url: 'https://soundcloud.com/artistname/track-title' })

    await controller.oembed(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, mockOEmbedResponse)
  })

  test('handles 404 from oEmbed service', async ({ assert }) => {
    globalThis.fetch = async () => {
      return new Response('Not found', { status: 404 })
    }

    const controller = new LinkController()
    const ctx = createMockContext({
      url: 'https://open.spotify.com/track/nonexistent',
    })

    await controller.oembed(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 404)
    assert.include((result.body as { error: string }).error, 'Content not found')
  })

  test('handles other error status from oEmbed service', async ({ assert }) => {
    globalThis.fetch = async () => {
      return new Response('Server error', { status: 500 })
    }

    const controller = new LinkController()
    const ctx = createMockContext({
      url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
    })

    await controller.oembed(ctx as never)
    const result = ctx.getMockResponse()

    // Upstream 5xx does not leak through — the API boundary returns 400
    assert.equal(result.status, 400)
    assert.include((result.body as { error: string }).error, 'Failed to fetch metadata')
  })

  test('handles network error gracefully', async ({ assert }) => {
    globalThis.fetch = async () => {
      throw new Error('Network error')
    }

    const controller = new LinkController()
    const ctx = createMockContext({
      url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
    })

    await controller.oembed(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 502)
    assert.include((result.body as { error: string }).error, 'Failed to connect')
  })

  test('handles missing fields in oEmbed response', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Some Track',
      // author_name and thumbnail_url missing
    }

    globalThis.fetch = async () => {
      return new Response(JSON.stringify(mockOEmbedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const controller = new LinkController()
    const ctx = createMockContext({
      url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
    })

    await controller.oembed(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, {
      title: 'Some Track',
      author_name: '',
      thumbnail_url: undefined,
    })
  })
})

test.group('LinkController - appleMusic', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns 400 when URL is missing', async ({ assert }) => {
    const controller = new LinkController()
    const ctx = createMockContext({})

    await controller.appleMusic(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 400)
    assert.deepEqual(result.body, { error: 'URL is required' })
  })

  test('returns 400 when URL is not a string', async ({ assert }) => {
    const controller = new LinkController()
    const ctx = createMockContext({ url: 123 })

    await controller.appleMusic(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 400)
    assert.deepEqual(result.body, { error: 'URL is required' })
  })

  test('returns 400 for invalid URL format', async ({ assert }) => {
    const controller = new LinkController()
    const ctx = createMockContext({ url: 'not-a-valid-url' })

    await controller.appleMusic(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 400)
    assert.deepEqual(result.body, { error: 'Invalid URL format' })
  })

  test('returns 400 for non-Apple Music URL', async ({ assert }) => {
    const controller = new LinkController()
    const ctx = createMockContext({ url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC' })

    await controller.appleMusic(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 400)
    assert.include(
      (result.body as { error: string }).error,
      'This endpoint only accepts Apple Music URLs'
    )
  })

  test('returns 200 with metadata when service succeeds', async ({ assert }) => {
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('/api/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Anti-Hero',
            author_name: 'Taylor Swift',
            thumbnail_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/abc123.jpg',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const controller = new LinkController()
    const ctx = createMockContext({
      url: 'https://music.apple.com/us/album/midnights/1649434004?i=1649434012',
    })

    await controller.appleMusic(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, {
      title: 'Anti-Hero',
      author_name: 'Taylor Swift',
      thumbnail_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/abc123.jpg',
    })
  })

  test('returns 422 when service returns an error', async ({ assert }) => {
    globalThis.fetch = async () => {
      return new Response('Not found', { status: 404 })
    }

    const controller = new LinkController()
    const ctx = createMockContext({
      url: 'https://music.apple.com/us/album/nonexistent/999999',
    })

    await controller.appleMusic(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 422)
    assert.property(result.body as object, 'error')
  })
})
