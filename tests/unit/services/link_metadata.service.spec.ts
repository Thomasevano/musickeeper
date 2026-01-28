import { test } from '@japa/runner'
import {
  LinkMetadataService,
  isLinkMetadataError,
  type SearchResultsSerializer,
} from '../../../src/infrastructure/services/link_metadata.service.js'
import { MusicItem, SearchType } from '../../../src/domain/music_item.js'

// Store original fetch
const originalFetch = globalThis.fetch

// Mock MusicBrainzRepository
class MockMusicBrainzRepository {
  public shouldReturnResults: boolean = true
  public shouldThrowError: boolean = false

  async searchItem(_query: string, type: string, _artist?: string) {
    if (this.shouldThrowError) {
      throw new Error('MusicBrainz API error')
    }

    if (!this.shouldReturnResults) {
      return type === 'album' ? { releases: [] } : { recordings: [] }
    }

    if (type === 'album') {
      return {
        releases: [
          {
            'id': 'mb-album-123',
            'title': 'Test Album',
            'date': '2023-01-01',
            'artist-credit': [{ artist: { name: 'Test Artist' } }],
          },
        ],
      }
    }

    return {
      recordings: [
        {
          'id': 'mb-track-456',
          'title': 'Test Track',
          'first-release-date': '2023-06-15',
          'length': 180000,
          'artist-credit': [{ artist: { name: 'Test Artist' } }],
          'releases': [{ id: 'release-789', title: 'Test Album' }],
        },
      ],
    }
  }
}

// Mock serializer that returns MusicItems directly
const mockSerializer: SearchResultsSerializer = async (searchResults) => {
  const results = searchResults as { releases?: unknown[]; recordings?: unknown[] }
  if (results.releases && results.releases.length > 0) {
    return [
      new MusicItem({
        id: 'mb-album-123',
        title: 'Test Album',
        releaseDate: '2023-01-01',
        artists: ['Test Artist'],
        itemType: SearchType.album,
        albumName: 'Test Album',
        coverArt: 'https://coverartarchive.org/test-cover.jpg',
      }),
    ]
  }
  if (results.recordings && results.recordings.length > 0) {
    return [
      new MusicItem({
        id: 'mb-track-456',
        title: 'Test Track',
        releaseDate: '2023-06-15',
        length: 180000,
        artists: ['Test Artist'],
        itemType: SearchType.track,
        albumName: 'Test Album',
        coverArt: 'https://coverartarchive.org/test-cover.jpg',
      }),
    ]
  }
  return []
}

test.group('LinkMetadataService - URL parsing errors', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns error for invalid URL format', async ({ assert }) => {
    const service = new LinkMetadataService(undefined, undefined, mockSerializer)
    const result = await service.fetchMetadata('not-a-valid-url')

    assert.isTrue(isLinkMetadataError(result))
    if (isLinkMetadataError(result)) {
      assert.equal(result.error, 'Invalid URL format')
      assert.equal(result.originalUrl, 'not-a-valid-url')
    }
  })

  test('returns error for unsupported platform', async ({ assert }) => {
    const service = new LinkMetadataService(undefined, undefined, mockSerializer)
    const result = await service.fetchMetadata('https://tidal.com/browse/track/12345')

    assert.isTrue(isLinkMetadataError(result))
    if (isLinkMetadataError(result)) {
      assert.include(result.error, 'Unsupported platform')
    }
  })
})

test.group('LinkMetadataService - Spotify oEmbed', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('fetches Spotify track and enriches with MusicBrainz', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Never Gonna Give You Up',
      author_name: 'Rick Astley',
      thumbnail_url: 'https://i.scdn.co/image/abc123',
    }

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('open.spotify.com/oembed')) {
        return new Response(JSON.stringify(mockOEmbedResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata(
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.source, 'musicbrainz')
      assert.equal(result.musicItem.title, 'Test Track')
      assert.deepEqual(result.musicItem.artists, ['Test Artist'])
      assert.equal(result.linkMetadata.title, 'Never Gonna Give You Up')
      assert.equal(result.linkMetadata.artist, 'Rick Astley')
      assert.equal(result.linkMetadata.type, SearchType.track)
    }
  })

  test('falls back to link metadata when MusicBrainz returns no results', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Rare Track',
      author_name: 'Unknown Artist',
      thumbnail_url: 'https://i.scdn.co/image/def456',
    }

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('open.spotify.com/oembed')) {
        return new Response(JSON.stringify(mockOEmbedResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    mockRepo.shouldReturnResults = false
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata(
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.source, 'link')
      assert.equal(result.musicItem.title, 'Rare Track')
      assert.deepEqual(result.musicItem.artists, ['Unknown Artist'])
      assert.equal(result.musicItem.coverArt, 'https://i.scdn.co/image/def456')
    }
  })

  test('falls back to link metadata when MusicBrainz throws error', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Some Track',
      author_name: 'Some Artist',
      thumbnail_url: 'https://i.scdn.co/image/ghi789',
    }

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('open.spotify.com/oembed')) {
        return new Response(JSON.stringify(mockOEmbedResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    mockRepo.shouldThrowError = true
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata(
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.source, 'link')
      assert.equal(result.musicItem.title, 'Some Track')
    }
  })

  test('handles Spotify album URL', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Test Album',
      author_name: 'Album Artist',
      thumbnail_url: 'https://i.scdn.co/image/album123',
    }

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('open.spotify.com/oembed')) {
        return new Response(JSON.stringify(mockOEmbedResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata(
      'https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.type, SearchType.album)
    }
  })
})

test.group('LinkMetadataService - YouTube oEmbed', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('fetches YouTube video metadata', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Never Gonna Give You Up',
      author_name: 'Rick Astley',
      thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    }

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('youtube.com/oembed')) {
        return new Response(JSON.stringify(mockOEmbedResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.title, 'Never Gonna Give You Up')
      assert.equal(result.linkMetadata.artist, 'Rick Astley')
      assert.equal(result.linkMetadata.type, SearchType.track)
    }
  })

  test('handles YouTube Music URL', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Music Video',
      author_name: 'Artist',
    }

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('youtube.com/oembed')) {
        return new Response(JSON.stringify(mockOEmbedResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    mockRepo.shouldReturnResults = false
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata('https://music.youtube.com/watch?v=abc123')

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.source, 'link')
    }
  })
})

test.group('LinkMetadataService - SoundCloud oEmbed', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('fetches SoundCloud track metadata', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Some Track',
      author_name: 'Some Artist',
      thumbnail_url: 'https://i1.sndcdn.com/artworks-abc123.jpg',
    }

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('soundcloud.com/oembed')) {
        return new Response(JSON.stringify(mockOEmbedResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata('https://soundcloud.com/artistname/track-title')

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.title, 'Some Track')
      assert.equal(result.linkMetadata.artist, 'Some Artist')
      assert.equal(result.linkMetadata.type, SearchType.track)
    }
  })
})

test.group('LinkMetadataService - Apple Music', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('fetches Apple Music track metadata from HTML', async ({ assert }) => {
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
      if (urlString.includes('music.apple.com')) {
        return new Response(mockHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata(
      'https://music.apple.com/us/album/midnights/1649434004?i=1649434288'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.title, 'Anti-Hero')
      assert.equal(result.linkMetadata.artist, 'Taylor Swift')
      assert.equal(result.linkMetadata.type, SearchType.track)
      assert.equal(
        result.linkMetadata.thumbnailUrl,
        'https://is1-ssl.mzstatic.com/image/thumb/Music/v4/abc123.jpg'
      )
    }
  })

  test('fetches Apple Music album metadata with "by" format', async ({ assert }) => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Midnights by Taylor Swift">
        <meta property="og:description" content="Album · 2022 · 13 songs">
        <meta property="og:image" content="https://is1-ssl.mzstatic.com/image/thumb/album.jpg">
      </head>
      <body></body>
      </html>
    `

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('music.apple.com')) {
        return new Response(mockHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata(
      'https://music.apple.com/us/album/midnights/1649434004'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.title, 'Midnights')
      assert.equal(result.linkMetadata.artist, 'Taylor Swift')
      assert.equal(result.linkMetadata.type, SearchType.album)
    }
  })

  test('returns error when Apple Music og:title is missing', async ({ assert }) => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:description" content="Some description">
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

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata(
      'https://music.apple.com/us/album/midnights/1649434004'
    )

    assert.isTrue(isLinkMetadataError(result))
    if (isLinkMetadataError(result)) {
      assert.include(result.error, 'Could not extract metadata')
    }
  })
})

test.group('LinkMetadataService - oEmbed errors', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns error when oEmbed returns 404', async ({ assert }) => {
    globalThis.fetch = async () => {
      return new Response('Not found', { status: 404 })
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata('https://open.spotify.com/track/nonexistent123')

    assert.isTrue(isLinkMetadataError(result))
    if (isLinkMetadataError(result)) {
      assert.include(result.error, 'Content not found')
    }
  })

  test('returns error when oEmbed service is unavailable', async ({ assert }) => {
    globalThis.fetch = async () => {
      return new Response('Server error', { status: 500 })
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata(
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'
    )

    assert.isTrue(isLinkMetadataError(result))
    if (isLinkMetadataError(result)) {
      assert.include(result.error, 'Failed to fetch metadata')
    }
  })

  test('returns error when network connection fails', async ({ assert }) => {
    globalThis.fetch = async () => {
      throw new Error('Network error')
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata(
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'
    )

    assert.isTrue(isLinkMetadataError(result))
    if (isLinkMetadataError(result)) {
      assert.include(result.error, 'Failed to connect')
    }
  })
})

test.group('LinkMetadataService - Partial data handling', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('handles missing artist in oEmbed response', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Track With No Artist',
      // author_name missing
    }

    globalThis.fetch = async () => {
      return new Response(JSON.stringify(mockOEmbedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const mockRepo = new MockMusicBrainzRepository()
    mockRepo.shouldReturnResults = false
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata(
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.source, 'link')
      assert.equal(result.musicItem.title, 'Track With No Artist')
      assert.deepEqual(result.musicItem.artists, [])
    }
  })

  test('handles missing thumbnail in oEmbed response', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: 'Track Without Thumbnail',
      author_name: 'Artist Name',
      // thumbnail_url missing
    }

    globalThis.fetch = async () => {
      return new Response(JSON.stringify(mockOEmbedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const mockRepo = new MockMusicBrainzRepository()
    mockRepo.shouldReturnResults = false
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata(
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.source, 'link')
      assert.isUndefined(result.musicItem.coverArt)
    }
  })

  test('handles empty title in oEmbed response', async ({ assert }) => {
    const mockOEmbedResponse = {
      title: '',
      author_name: 'Artist Name',
    }

    globalThis.fetch = async () => {
      return new Response(JSON.stringify(mockOEmbedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const mockRepo = new MockMusicBrainzRepository()
    mockRepo.shouldReturnResults = false
    const service = new LinkMetadataService(undefined, mockRepo as never, mockSerializer)
    const result = await service.fetchMetadata(
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.source, 'link')
      // Fallback uses "Unknown Title" when title is empty
      assert.equal(result.musicItem.title, 'Unknown Title')
    }
  })
})
