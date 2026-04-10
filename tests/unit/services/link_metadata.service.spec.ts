import { test } from '@japa/runner'
import {
  LinkMetadataService,
  isLinkMetadataError,
} from '../../../src/infrastructure/services/link_metadata.service.js'
import {
  MusicBrainzEnrichmentService,
  type SearchResultsSerializer,
} from '../../../src/infrastructure/services/musicbrainz_enrichment.service.js'
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
    const service = new LinkMetadataService()
    const result = await service.fetchMetadata('not-a-valid-url')

    assert.isTrue(isLinkMetadataError(result))
    if (isLinkMetadataError(result)) {
      assert.equal(result.error, 'Invalid URL format')
      assert.equal(result.originalUrl, 'not-a-valid-url')
    }
  })

  test('returns error for unsupported platform', async ({ assert }) => {
    const service = new LinkMetadataService()
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
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
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
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
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
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
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
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
    const result = await service.fetchMetadata(
      'https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.type, SearchType.album)
    }
  })
})

test.group('LinkMetadataService - Spotify HTML fallback', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('enriches from HTML when oEmbed returns no author_name', async ({ assert }) => {
    const spotifyHtml = `
      <html><head>
        <meta property="og:description" content="Rick Astley · Whenever You Need Somebody · Song · 1987">
        <meta property="og:title" content="Never Gonna Give You Up">
      </head></html>
    `

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('open.spotify.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Never Gonna Give You Up',
            thumbnail_url: 'https://i.scdn.co/image/abc123',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlString.includes('open.spotify.com/track')) {
        return new Response(spotifyHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
    const result = await service.fetchMetadata(
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.artist, 'Rick Astley')
      assert.equal(result.linkMetadata.albumName, 'Whenever You Need Somebody')
      // MusicBrainz enriches since artist is now available
      assert.equal(result.source, 'musicbrainz')
      // Album name from Spotify HTML overrides MusicBrainz
      assert.equal(result.musicItem.albumName, 'Whenever You Need Somebody')
    }
  })

  test('uses link thumbnail when MusicBrainz has no cover art', async ({ assert }) => {
    const spotifyHtml = `
      <html><head>
        <meta property="og:description" content="Rick Astley · Whenever You Need Somebody · Song · 1987">
      </head></html>
    `

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('open.spotify.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Never Gonna Give You Up',
            thumbnail_url: 'https://i.scdn.co/image/abc123',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlString.includes('open.spotify.com/track')) {
        return new Response(spotifyHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    // Use a serializer that returns a MusicItem with blank cover art (like real MusicBrainz)
    const blankCoverSerializer: SearchResultsSerializer = async () => [
      new MusicItem({
        id: 'mb-track-456',
        title: 'Test Track',
        releaseDate: '2023-06-15',
        artists: ['Test Artist'],
        itemType: SearchType.track,
        coverArt: '../../../../resources/images/Blank_album.svg',
      }),
    ]

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, blankCoverSerializer))
    const result = await service.fetchMetadata(
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.source, 'musicbrainz')
      // Should use Spotify thumbnail instead of Blank_album placeholder
      assert.equal(result.musicItem.coverArt, 'https://i.scdn.co/image/abc123')
    }
  })

  test('falls back gracefully when HTML scraping fails', async ({ assert }) => {
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('open.spotify.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Some Track',
            thumbnail_url: 'https://i.scdn.co/image/abc123',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlString.includes('open.spotify.com/track')) {
        return new Response('', { status: 500 })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const service = new LinkMetadataService()
    const result = await service.fetchMetadata('https://open.spotify.com/track/abc123')

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      // Falls back to link metadata with empty artist
      assert.equal(result.source, 'link')
      assert.equal(result.linkMetadata.artist, '')
      assert.equal(result.musicItem.title, 'Some Track')
    }
  })

  test('skips HTML fallback when oEmbed already has author_name', async ({ assert }) => {
    let htmlFetchCalled = false

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('open.spotify.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Never Gonna Give You Up',
            author_name: 'Rick Astley',
            thumbnail_url: 'https://i.scdn.co/image/abc123',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlString.includes('open.spotify.com/track')) {
        htmlFetchCalled = true
        return new Response('', { status: 200 })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
    await service.fetchMetadata('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC')

    assert.isFalse(htmlFetchCalled, 'Should not fetch HTML when oEmbed has author_name')
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
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
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
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
    const result = await service.fetchMetadata('https://music.youtube.com/watch?v=abc123')

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.source, 'link')
    }
  })

  test('extracts clean artist and album from YouTube auto-generated description', async ({
    assert,
  }) => {
    // Simulates ytInitialPlayerResponse embedded in YouTube page HTML
    const ytPageHtml = `<html><head>
      <meta property="og:description" content="Tame Impala">
    </head><body>
      <script>var ytInitialPlayerResponse = {"videoDetails":{"shortDescription":"Provided to YouTube by Columbia\\n\\nMy Old Ways \\u00b7 Tame Impala\\n\\nDeadbeat\\n\\n\\u2117 2025 Columbia Records"}};</script>
    </body></html>`

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('youtube.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'My Old Ways',
            author_name: 'Tame Impala - Topic',
            thumbnail_url: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlString.includes('www.youtube.com/watch')) {
        return new Response(ytPageHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
    const result = await service.fetchMetadata('https://music.youtube.com/watch?v=e1N_fJlJaXY')

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.artist, 'Tame Impala')
      assert.equal(result.linkMetadata.albumName, 'Deadbeat')
      // Album from YouTube overrides MusicBrainz
      assert.equal(result.musicItem.albumName, 'Deadbeat')
    }
  })

  test('keeps oEmbed artist when no "- Topic" suffix', async ({ assert }) => {
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('youtube.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Never Gonna Give You Up',
            author_name: 'Rick Astley',
            thumbnail_url: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
    const result = await service.fetchMetadata('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      // No HTML fetch needed — artist is clean
      assert.equal(result.linkMetadata.artist, 'Rick Astley')
    }
  })

  test('handles multiple artists separated by middle dots', async ({ assert }) => {
    const ytPageHtml = `<html><body>
      <script>var ytInitialPlayerResponse = {"videoDetails":{"shortDescription":"Provided to YouTube by PIAS\\n\\nLa vie qu\\u2019on m\\u00e8ne \\u00b7 ISHA \\u00b7 Limsa d'Aulnay\\n\\nBitume Caviar (vol.2)\\n\\n\\u2117 2025 Feelsafe"}};</script>
    </body></html>`

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('youtube.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: "La vie qu'on mène",
            author_name: 'ISHA - Topic',
            thumbnail_url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlString.includes('www.youtube.com/watch')) {
        return new Response(ytPageHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    mockRepo.shouldReturnResults = false
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
    const result = await service.fetchMetadata('https://music.youtube.com/watch?v=V0J5U1z2Wu8')

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      // Artists joined with comma, not middle dot
      assert.equal(result.linkMetadata.artist, "ISHA, Limsa d'Aulnay")
      // Each artist is a separate entry
      assert.deepEqual(result.musicItem.artists, ['ISHA', "Limsa d'Aulnay"])
      assert.equal(result.linkMetadata.albumName, 'Bitume Caviar (vol.2)')
    }
  })
})

test.group('LinkMetadataService - YouTube Music playlist', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('fetches album metadata from YouTube Music playlist URL', async ({ assert }) => {
    const playlistHtml = `<html><head>
      <meta property="og:title" content="Yeezus - Album de Kanye West">
      <meta property="og:image" content="https://yt3.googleusercontent.com/abc123=w544-h544-l90-rj">
      <meta property="og:type" content="music.album">
    </head></html>`

    globalThis.fetch = async (_url: string | URL | Request) => {
      return new Response(playlistHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    const mockRepo = new MockMusicBrainzRepository()
    mockRepo.shouldReturnResults = false
    const service = new LinkMetadataService(
      undefined,
      undefined,
      new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer)
    )
    const result = await service.fetchMetadata(
      'https://music.youtube.com/playlist?list=OLAK5uy_lJ0yXPKvCREyQl6Bcxp6I8CAfrD-yX-VA'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.title, 'Yeezus')
      assert.equal(result.linkMetadata.artist, 'Kanye West')
      assert.equal(result.linkMetadata.type, SearchType.album)
      assert.equal(
        result.musicItem.coverArt,
        'https://yt3.googleusercontent.com/abc123=w544-h544-l90-rj'
      )
    }
  })

  test('handles localized "Album by" variants in og:title', async ({ assert }) => {
    // Test English format
    const playlistHtmlEn = `<html><head>
      <meta property="og:title" content="USB - Album by Fred again..">
      <meta property="og:image" content="https://yt3.googleusercontent.com/usb.jpg">
    </head></html>`

    globalThis.fetch = async () =>
      new Response(playlistHtmlEn, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })

    const service = new LinkMetadataService()
    const result = await service.fetchMetadata(
      'https://music.youtube.com/playlist?list=OLAK5uy_test'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.title, 'USB')
      assert.equal(result.linkMetadata.artist, 'Fred again..')
    }
  })
})

test.group('LinkMetadataService - SoundCloud oEmbed', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('strips "by Author" from title using HTML og:title', async ({ assert }) => {
    const soundcloudHtml = `
      <html><head>
        <meta property="og:title" content="Never Gonna Give You Up">
      </head></html>
    `

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('soundcloud.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Never Gonna Give You Up by Rick Astley',
            author_name: 'Rick Astley',
            thumbnail_url: 'https://i1.sndcdn.com/artworks-abc123.jpg',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlString.includes('soundcloud.com/rick-astley')) {
        return new Response(soundcloudHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
    const result = await service.fetchMetadata(
      'https://soundcloud.com/rick-astley/never-gonna-give-you-up'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.title, 'Never Gonna Give You Up')
      assert.equal(result.linkMetadata.artist, 'Rick Astley')
    }
  })

  test('keeps oEmbed title when HTML scraping fails', async ({ assert }) => {
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('soundcloud.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Some Track by Some Artist',
            author_name: 'Some Artist',
            thumbnail_url: 'https://i1.sndcdn.com/artworks-abc123.jpg',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlString.includes('soundcloud.com/some-artist')) {
        return new Response('', { status: 500 })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const service = new LinkMetadataService()
    const result = await service.fetchMetadata('https://soundcloud.com/some-artist/some-track')

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      // Falls back to oEmbed title (with "by" suffix) — still usable
      assert.equal(result.linkMetadata.title, 'Some Track by Some Artist')
    }
  })
})

test.group('LinkMetadataService - Apple Music oEmbed', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('fetches Apple Music track metadata via oEmbed API', async ({ assert }) => {
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

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
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

  test('fetches Apple Music album metadata via oEmbed API', async ({ assert }) => {
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('/api/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Midnights',
            author_name: 'Taylor Swift',
            thumbnail_url: 'https://is1-ssl.mzstatic.com/image/thumb/album.jpg',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
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

  test('oEmbed returns clean artist name without localization suffix', async ({ assert }) => {
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('/api/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Save The Day (From "Hoppers") - Single',
            author_name: 'SZA',
            thumbnail_url: 'https://is1-ssl.mzstatic.com/image/thumb/cover.jpg',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
    const result = await service.fetchMetadata(
      'https://music.apple.com/fr/album/save-the-day-from-hoppers/1877213779?i=1877213780&l=en-GB'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.artist, 'SZA')
      assert.notInclude(result.linkMetadata.artist, 'on Apple Music')
    }
  })
})

test.group('LinkMetadataService - Apple Music HTML fallback', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('falls back to HTML scraping when oEmbed returns 404', async ({ assert }) => {
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
      if (urlString.includes('/api/oembed')) {
        return new Response('Not found', { status: 404 })
      }
      if (urlString.includes('music.apple.com')) {
        return new Response(mockHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
    const result = await service.fetchMetadata(
      'https://music.apple.com/us/album/midnights/1649434004?i=1649434288'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.title, 'Anti-Hero')
      assert.equal(result.linkMetadata.artist, 'Taylor Swift')
      assert.equal(result.linkMetadata.type, SearchType.track)
    }
  })

  test('falls back to HTML scraping when oEmbed throws network error', async ({ assert }) => {
    let fetchCallCount = 0
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
      fetchCallCount++
      const urlString = url.toString()
      if (urlString.includes('itunes.apple.com')) {
        return new Response(JSON.stringify({ resultCount: 0, results: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (urlString.includes('/api/oembed')) {
        throw new Error('Network error')
      }
      if (urlString.includes('music.apple.com')) {
        return new Response(mockHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
    const result = await service.fetchMetadata(
      'https://music.apple.com/us/album/midnights/1649434004'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.title, 'Midnights')
      assert.equal(result.linkMetadata.artist, 'Taylor Swift')
      assert.equal(result.linkMetadata.type, SearchType.album)
    }
    assert.equal(fetchCallCount, 3)
  })

  test('strips "on Apple Music" suffix from HTML fallback artist', async ({ assert }) => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Anti-Hero - Taylor Swift on Apple Music">
        <meta property="og:description" content="Taylor Swift · Midnights · 2022">
        <meta property="og:image" content="https://is1-ssl.mzstatic.com/image/thumb/Music/v4/abc123.jpg">
      </head>
      <body></body>
      </html>
    `

    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('/api/oembed')) {
        return new Response('Not found', { status: 404 })
      }
      if (urlString.includes('music.apple.com')) {
        return new Response(mockHtml, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }
      throw new Error(`Unexpected fetch: ${urlString}`)
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
    const result = await service.fetchMetadata(
      'https://music.apple.com/us/album/midnights/1649434004?i=1649434288'
    )

    assert.isFalse(isLinkMetadataError(result))
    if (!isLinkMetadataError(result)) {
      assert.equal(result.linkMetadata.title, 'Anti-Hero')
      assert.equal(result.linkMetadata.artist, 'Taylor Swift')
    }
  })

  test('returns error when both oEmbed and HTML fail', async ({ assert }) => {
    globalThis.fetch = async (url: string | URL | Request) => {
      const urlString = url.toString()
      if (urlString.includes('/api/oembed')) {
        return new Response('Not found', { status: 404 })
      }
      // HTML page has no og:title
      return new Response(
        '<html><head><meta property="og:description" content="Some description"></head><body></body></html>',
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const mockRepo = new MockMusicBrainzRepository()
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
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
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
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
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
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
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
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
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
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
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
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
    const service = new LinkMetadataService(undefined, undefined, new MusicBrainzEnrichmentService(mockRepo as never, mockSerializer))
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
