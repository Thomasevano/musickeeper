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

    assert.equal(result.status, 500)
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
    // Restore original fetch after each test
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

  test('fetches Apple Music metadata successfully with dash format title', async ({ assert }) => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Anti-Hero - Taylor Swift">
        <meta property="og:description" content="Taylor Swift · Midnights · 2022">
        <meta property="og:image" content="https://is1-ssl.mzstatic.com/image/thumb/Music/v4/abc123.jpg">
      </head>
      <body></body>
      </html>
    `

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      assert.include(urlString, 'music.apple.com')

      return new Response(mockHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
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

  test('fetches Apple Music album metadata with "by" format title', async ({ assert }) => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Midnights by Taylor Swift">
        <meta property="og:description" content="Album · 2022 · 13 songs">
        <meta property="og:image" content="https://is1-ssl.mzstatic.com/image/thumb/Music/v4/def456.jpg">
      </head>
      <body></body>
      </html>
    `

    globalThis.fetch = async () => {
      return new Response(mockHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    const controller = new LinkController()
    const ctx = createMockContext({
      url: 'https://music.apple.com/us/album/midnights/1649434004',
    })

    await controller.appleMusic(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, {
      title: 'Midnights',
      author_name: 'Taylor Swift',
      thumbnail_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/def456.jpg',
    })
  })

  test('extracts artist from description when not in title', async ({ assert }) => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Some Song Title">
        <meta property="og:description" content="Artist Name · Album Name · 2023">
        <meta property="og:image" content="https://is1-ssl.mzstatic.com/image/thumb/Music/v4/ghi789.jpg">
      </head>
      <body></body>
      </html>
    `

    globalThis.fetch = async () => {
      return new Response(mockHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    const controller = new LinkController()
    const ctx = createMockContext({
      url: 'https://music.apple.com/us/album/some-album/123456?i=654321',
    })

    await controller.appleMusic(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, {
      title: 'Some Song Title',
      author_name: 'Artist Name',
      thumbnail_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/ghi789.jpg',
    })
  })

  test('handles 404 from Apple Music', async ({ assert }) => {
    globalThis.fetch = async () => {
      return new Response('Not found', { status: 404 })
    }

    const controller = new LinkController()
    const ctx = createMockContext({
      url: 'https://music.apple.com/us/album/nonexistent/999999',
    })

    await controller.appleMusic(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 404)
    assert.include((result.body as { error: string }).error, 'Content not found on Apple Music')
  })

  test('handles other error status from Apple Music', async ({ assert }) => {
    globalThis.fetch = async () => {
      return new Response('Server error', { status: 500 })
    }

    const controller = new LinkController()
    const ctx = createMockContext({
      url: 'https://music.apple.com/us/album/midnights/1649434004',
    })

    await controller.appleMusic(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 500)
    assert.include((result.body as { error: string }).error, 'Failed to fetch metadata')
  })

  test('handles network error gracefully', async ({ assert }) => {
    globalThis.fetch = async () => {
      throw new Error('Network error')
    }

    const controller = new LinkController()
    const ctx = createMockContext({
      url: 'https://music.apple.com/us/album/midnights/1649434004',
    })

    await controller.appleMusic(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 502)
    assert.include((result.body as { error: string }).error, 'Failed to connect to Apple Music')
  })

  test('returns 422 when og:title is missing', async ({ assert }) => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:description" content="Some description">
        <meta property="og:image" content="https://example.com/image.jpg">
      </head>
      <body></body>
      </html>
    `

    globalThis.fetch = async () => {
      return new Response(mockHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    const controller = new LinkController()
    const ctx = createMockContext({
      url: 'https://music.apple.com/us/album/midnights/1649434004',
    })

    await controller.appleMusic(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 422)
    assert.include((result.body as { error: string }).error, 'Could not extract metadata')
  })

  test('handles missing thumbnail gracefully', async ({ assert }) => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Anti-Hero - Taylor Swift">
        <meta property="og:description" content="Taylor Swift · Midnights · 2022">
      </head>
      <body></body>
      </html>
    `

    globalThis.fetch = async () => {
      return new Response(mockHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
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
      thumbnail_url: undefined,
    })
  })

  test('handles meta tags with content before property attribute', async ({ assert }) => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta content="Shake It Off - Taylor Swift" property="og:title">
        <meta content="Taylor Swift · 1989 · 2014" property="og:description">
        <meta content="https://example.com/cover.jpg" property="og:image">
      </head>
      <body></body>
      </html>
    `

    globalThis.fetch = async () => {
      return new Response(mockHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    const controller = new LinkController()
    const ctx = createMockContext({
      url: 'https://music.apple.com/us/album/1989/1440913620?i=1440913650',
    })

    await controller.appleMusic(ctx as never)
    const result = ctx.getMockResponse()

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, {
      title: 'Shake It Off',
      author_name: 'Taylor Swift',
      thumbnail_url: 'https://example.com/cover.jpg',
    })
  })
})
