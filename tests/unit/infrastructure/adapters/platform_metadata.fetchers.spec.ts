import { test } from '@japa/runner'
import { mock } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { StreamingPlatform } from '#domain/link.js'
import { SearchType } from '#domain/music_item.js'
import { fetchAppleMusicMetadata } from '#infrastructure/adapters/platform_metadata/apple_music.js'
import { fetchOEmbedMetadata } from '#infrastructure/adapters/platform_metadata/oembed.js'
import { fetchSoundCloudMetadata } from '#infrastructure/adapters/platform_metadata/soundcloud.js'
import { fetchSpotifyMetadata } from '#infrastructure/adapters/platform_metadata/spotify.js'
import { fetchYouTubeMetadata } from '#infrastructure/adapters/platform_metadata/youtube.js'

const originalFetch = globalThis.fetch

test.group('Platform metadata fetchers', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('decodes HTML entities from oEmbed metadata', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          title: 'Track &amp; More',
          author_name: 'Artist &quot;Name&quot;',
          thumbnail_url: 'https://covers.example/track.jpg',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )

    const result = await fetchOEmbedMetadata(
      StreamingPlatform.Spotify,
      'https://open.spotify.com/oembed',
      'https://open.spotify.com/track/track-id'
    )

    assert.deepEqual(result, {
      title: 'Track & More',
      author_name: 'Artist "Name"',
      thumbnail_url: 'https://covers.example/track.jpg',
    })
  })

  test('reports missing oEmbed content', async ({ assert }) => {
    globalThis.fetch = async () => new Response(null, { status: 404 })

    const result = await fetchOEmbedMetadata(
      StreamingPlatform.YouTube,
      'https://www.youtube.com/oembed',
      'https://www.youtube.com/watch?v=missing'
    )

    assert.deepEqual(result, { error: 'Content not found on the streaming platform' })
  })

  test('identifies the platform when its oEmbed endpoint fails', async ({ assert }) => {
    globalThis.fetch = async () => new Response(null, { status: 503 })

    const result = await fetchOEmbedMetadata(
      StreamingPlatform.Spotify,
      'https://open.spotify.com/oembed',
      'https://open.spotify.com/track/unavailable'
    )

    assert.deepEqual(result, { error: 'Failed to fetch metadata from spotify' })
  })

  test('identifies the platform when its oEmbed endpoint is unreachable', async ({ assert }) => {
    globalThis.fetch = async () => {
      throw new Error('network unavailable')
    }

    const result = await fetchOEmbedMetadata(
      StreamingPlatform.SoundCloud,
      'https://soundcloud.com/oembed',
      'https://soundcloud.com/artist/track'
    )

    assert.deepEqual(result, { error: 'Failed to connect to soundcloud oEmbed service' })
  })

  test('uses structured Apple Music track credits alongside iTunes metadata', async ({
    assert,
  }) => {
    const sourceUrl = 'https://music.apple.com/us/album/album-name/album-id?i=track-id'
    globalThis.fetch = async (input) => {
      if (input.toString() === sourceUrl) {
        const data = {
          '@type': 'MusicComposition',
          'audio': {
            '@type': 'MusicRecording',
            'byArtist': [{ name: 'Artist One, Jr.' }, { name: 'Artist Two' }],
            'inAlbum': { byArtist: [{ name: 'Album Artist' }] },
          },
        }
        return new Response(`<script type="application/ld+json">${JSON.stringify(data)}</script>`)
      }

      if (!input.toString().startsWith('https://itunes.apple.com/lookup')) {
        throw new Error(`Unexpected request: ${input}`)
      }

      return new Response(
        JSON.stringify({
          resultCount: 1,
          results: [
            {
              trackName: 'Track Name',
              collectionName: 'Album Name',
              artistName: 'Artist One, Jr. & Artist Two',
              artworkUrl100: 'https://covers.example/100x100bb.jpg',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const result = await fetchAppleMusicMetadata({
      platform: StreamingPlatform.AppleMusic,
      type: SearchType.track,
      id: 'track-id',
      originalUrl: sourceUrl,
    })

    assert.deepEqual(result, {
      title: 'Track Name',
      author_name: 'Artist One, Jr. & Artist Two',
      artists: ['Artist One, Jr.', 'Artist Two'],
      album_name: 'Album Name',
      thumbnail_url: 'https://covers.example/600x600bb.jpg',
    })
  })

  test('returns iTunes metadata when the Apple Music page body stalls', async ({ assert }) => {
    const sourceUrl = 'https://music.apple.com/us/song/stalled-page/track-id'
    globalThis.fetch = async (input, options) => {
      const url = input.toString()
      if (url === sourceUrl) {
        return new Response(
          new ReadableStream({
            start(controller) {
              const signal = options?.signal
              signal?.addEventListener('abort', () => controller.error(signal.reason), {
                once: true,
              })
            },
          })
        )
      }

      if (!url.startsWith('https://itunes.apple.com/lookup')) {
        throw new Error(`Unexpected request: ${url}`)
      }

      return Response.json({
        resultCount: 1,
        results: [{ trackName: 'Track Name', artistName: 'Artist One & Artist Two' }],
      })
    }

    mock.timers.enable({ apis: ['setTimeout'] })
    try {
      const metadata = fetchAppleMusicMetadata({
        platform: StreamingPlatform.AppleMusic,
        type: SearchType.track,
        id: 'track-id',
        originalUrl: sourceUrl,
      })

      // Let the fetch resolve with headers and begin reading the body before advancing the clock.
      await setImmediate()
      mock.timers.tick(1_000)

      const result = await Promise.race([metadata, setImmediate()])
      assert.deepEqual(result, {
        title: 'Track Name',
        author_name: 'Artist One & Artist Two',
        album_name: undefined,
        thumbnail_url: undefined,
      })
    } finally {
      mock.timers.reset()
    }
  })

  test('falls back to Apple Music oEmbed when iTunes has no result', async ({ assert }) => {
    const sourceUrl = 'https://music.apple.com/us/song/fallback-track/track-id'

    globalThis.fetch = async (input) => {
      const url = input.toString()

      if (url.startsWith('https://itunes.apple.com/lookup')) {
        return new Response(JSON.stringify({ resultCount: 0, results: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.startsWith('https://music.apple.com/api/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Fallback Track on Apple Music',
            author_name: 'Fallback Artist, Jr. on Apple Music',
            thumbnail_url: 'https://covers.example/fallback.jpg',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (url === sourceUrl) return new Response(null, { status: 503 })

      throw new Error(`Unexpected request: ${url}`)
    }

    const result = await fetchAppleMusicMetadata({
      platform: StreamingPlatform.AppleMusic,
      type: SearchType.track,
      id: 'track-id',
      originalUrl: sourceUrl,
    })

    assert.deepEqual(result, {
      title: 'Fallback Track',
      author_name: 'Fallback Artist, Jr.',
      thumbnail_url: 'https://covers.example/fallback.jpg',
    })
  })

  test('uses a slow Apple Music page when lookup and oEmbed cannot supply metadata', async ({
    assert,
  }) => {
    const sourceUrl = 'https://music.apple.com/us/song/example/123'
    globalThis.fetch = async (input, options) => {
      const url = input.toString()
      if (url.startsWith('https://itunes.apple.com/lookup')) {
        return Response.json({ resultCount: 0, results: [] })
      }
      if (url !== sourceUrl) return new Response(null, { status: 503 })
      const { promise, resolve, reject } = Promise.withResolvers<void>()
      const timer = setTimeout(resolve, 1_100)
      const signal = options?.signal
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(signal.reason)
        },
        { once: true }
      )
      await promise
      return new Response('<meta property="og:title" content="Example by Artist on Apple Music">')
    }

    mock.timers.enable({ apis: ['setTimeout'] })
    try {
      const metadata = fetchAppleMusicMetadata({
        platform: StreamingPlatform.AppleMusic,
        type: SearchType.track,
        id: '123',
        originalUrl: sourceUrl,
      })
      mock.timers.tick(1_000)
      await setImmediate()
      mock.timers.tick(1_100)
      assert.deepInclude(await metadata, { title: 'Example', author_name: 'Artist' })
    } finally {
      mock.timers.reset()
    }
  })

  test('keeps Apple Music album credits from JSON-LD when lookup and oEmbed fail', async ({
    assert,
  }) => {
    const sourceUrl = 'https://music.apple.com/us/album/html-album/album-id'

    globalThis.fetch = async (input) => {
      const url = input.toString()

      if (url.startsWith('https://itunes.apple.com/lookup')) {
        return new Response(JSON.stringify({ resultCount: 0, results: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url.startsWith('https://music.apple.com/api/oembed')) {
        return new Response(null, { status: 503 })
      }

      if (url === sourceUrl) {
        const data = {
          '@type': 'MusicAlbum',
          'byArtist': [{ name: 'HTML Artist, Jr.' }, { name: 'Another Artist' }],
        }
        return new Response(
          [
            '<meta property="og:title" content="HTML Album - HTML Artist, Jr. &amp; Another Artist on Apple Music">',
            '<meta property=\"og:image\" content=\"https://covers.example/html.jpg\">',
            `<script type="application/ld+json">${JSON.stringify(data)}</script>`,
          ].join(''),
          { status: 200, headers: { 'Content-Type': 'text/html' } }
        )
      }

      throw new Error(`Unexpected request: ${url}`)
    }

    const result = await fetchAppleMusicMetadata({
      platform: StreamingPlatform.AppleMusic,
      type: SearchType.album,
      id: 'album-id',
      originalUrl: sourceUrl,
    })

    assert.deepEqual(result, {
      title: 'HTML Album',
      author_name: 'HTML Artist, Jr. & Another Artist',
      artists: ['HTML Artist, Jr.', 'Another Artist'],
      thumbnail_url: 'https://covers.example/html.jpg',
    })
  })

  test('reports missing Apple Music content after exhausting fallbacks', async ({ assert }) => {
    const sourceUrl = 'https://music.apple.com/us/song/missing/track-id'

    globalThis.fetch = async (input) => {
      const url = input.toString()
      if (url === sourceUrl) return new Response(null, { status: 404 })
      return new Response(null, { status: 503 })
    }

    const result = await fetchAppleMusicMetadata({
      platform: StreamingPlatform.AppleMusic,
      type: SearchType.track,
      id: 'track-id',
      originalUrl: sourceUrl,
    })

    assert.deepEqual(result, { error: 'Content not found on Apple Music' })
  })

  test('keeps structured Spotify track credits alongside page metadata', async ({ assert }) => {
    const sourceUrl = 'https://open.spotify.com/track/track-id'

    globalThis.fetch = async (input) => {
      const url = input.toString()

      if (url.startsWith('https://open.spotify.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Track Name',
            author_name: '',
            thumbnail_url: 'https://covers.example/spotify.jpg',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (url === sourceUrl) {
        return new Response(
          '<meta property="og:description" content="Fallback Artist, Jr. · Fallback Album · Track · 2026">',
          { status: 200, headers: { 'Content-Type': 'text/html' } }
        )
      }

      if (url === 'https://open.spotify.com/embed/track/track-id') {
        const artists = [{ name: 'Artist One, Jr.' }, { name: 'Artist Two' }]
        const data = { props: { pageProps: { state: { data: { entity: { artists } } } } } }
        return new Response(
          `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`
        )
      }

      throw new Error(`Unexpected request: ${url}`)
    }

    const result = await fetchSpotifyMetadata({
      platform: StreamingPlatform.Spotify,
      type: SearchType.track,
      id: 'track-id',
      originalUrl: sourceUrl,
    })

    assert.deepEqual(result, {
      title: 'Track Name',
      author_name: 'Fallback Artist, Jr.',
      artists: ['Artist One, Jr.', 'Artist Two'],
      album_name: 'Fallback Album',
      thumbnail_url: 'https://covers.example/spotify.jpg',
    })
  })

  for (const stalled of ['headers', 'body'] as const) {
    test(`uses Spotify page metadata when track embed ${stalled} stall`, async ({ assert }) => {
      const sourceUrl = 'https://open.spotify.com/track/track-id'

      globalThis.fetch = async (input, options) => {
        const url = input.toString()
        if (url.startsWith('https://open.spotify.com/oembed')) {
          return Response.json({
            title: 'Track Name',
            thumbnail_url: 'https://covers.example/spotify.jpg',
          })
        }
        if (url === sourceUrl) {
          return new Response(
            '<meta property="og:description" content="Page Artist · Page Album · Track · 2026">'
          )
        }
        if (url !== 'https://open.spotify.com/embed/track/track-id') {
          throw new Error(`Unexpected request: ${url}`)
        }

        const signal = options?.signal
        if (stalled === 'headers') {
          const { promise, reject } = Promise.withResolvers<Response>()
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
          return promise
        }

        // Spend part of the deadline waiting for headers before stalling the body.
        const { promise, resolve } = Promise.withResolvers<void>()
        setTimeout(resolve, 750)
        await promise
        return new Response(
          new ReadableStream({
            start(controller) {
              signal?.addEventListener('abort', () => controller.error(signal.reason), {
                once: true,
              })
            },
          })
        )
      }

      mock.timers.enable({ apis: ['setTimeout'] })
      try {
        const metadata = fetchSpotifyMetadata({
          platform: StreamingPlatform.Spotify,
          type: SearchType.track,
          id: 'track-id',
          originalUrl: sourceUrl,
        })

        await setImmediate()
        mock.timers.tick(750)
        await setImmediate()
        mock.timers.tick(250)

        assert.deepEqual(await Promise.race([metadata, setImmediate()]), {
          title: 'Track Name',
          author_name: 'Page Artist',
          album_name: 'Page Album',
          thumbnail_url: 'https://covers.example/spotify.jpg',
        })
      } finally {
        mock.timers.reset()
      }
    })
  }

  test('replaces SoundCloud oEmbed titles with the source page title', async ({ assert }) => {
    const sourceUrl = 'https://soundcloud.com/artist/track'

    globalThis.fetch = async (input) => {
      const url = input.toString()

      if (url.startsWith('https://soundcloud.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Track by Artist | Free Listening on SoundCloud',
            author_name: 'Artist',
            thumbnail_url: 'https://covers.example/soundcloud.jpg',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (url === sourceUrl) {
        return new Response('<meta property=\"og:title\" content=\"Clean Track Title\">', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }

      throw new Error(`Unexpected request: ${url}`)
    }

    const result = await fetchSoundCloudMetadata({
      platform: StreamingPlatform.SoundCloud,
      type: SearchType.track,
      id: 'artist/track',
      originalUrl: sourceUrl,
    })

    assert.deepEqual(result, {
      title: 'Clean Track Title',
      author_name: 'Artist',
      thumbnail_url: 'https://covers.example/soundcloud.jpg',
    })
  })

  test('fetches YouTube Music playlists directly from their source page', async ({ assert }) => {
    const sourceUrl = 'https://music.youtube.com/playlist?list=playlist-id'

    globalThis.fetch = async (input) => {
      const url = input.toString()
      if (url !== sourceUrl) throw new Error(`Unexpected request: ${url}`)

      return new Response(
        [
          '<meta property=\"og:title\" content=\"Album Name - Álbum de Artist Name\">',
          '<meta property=\"og:image\" content=\"https://covers.example/youtube-playlist.jpg\">',
        ].join(''),
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      )
    }

    const result = await fetchYouTubeMetadata({
      platform: StreamingPlatform.YouTube,
      type: SearchType.album,
      id: 'playlist-id',
      originalUrl: sourceUrl,
    })

    assert.deepEqual(result, {
      title: 'Album Name',
      author_name: 'Artist Name',
      thumbnail_url: 'https://covers.example/youtube-playlist.jpg',
    })
  })

  test('uses the YouTube Topic credit without splitting punctuation in the description', async ({
    assert,
  }) => {
    const sourceUrl = 'https://music.youtube.com/watch?v=video-id'
    const description = [
      'Provided to YouTube by Label',
      '',
      'Topic · Track · Artist One, Jr. · Artist Two',
      '',
      'Topic Album',
      '',
      '℗ 2026 Label',
    ].join('\n')

    globalThis.fetch = async (input) => {
      const url = input.toString()

      if (url.startsWith('https://www.youtube.com/oembed')) {
        return new Response(
          JSON.stringify({
            title: 'Topic · Track',
            author_name: 'Artist One - Topic',
            thumbnail_url: 'https://covers.example/youtube-topic.jpg',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (url === 'https://www.youtube.com/watch?v=video-id') {
        const playerResponse = JSON.stringify({ videoDetails: { shortDescription: description } })
        return new Response(`<script>var ytInitialPlayerResponse = ${playerResponse};</script>`, {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      }

      throw new Error(`Unexpected request: ${url}`)
    }

    const result = await fetchYouTubeMetadata({
      platform: StreamingPlatform.YouTube,
      type: SearchType.track,
      id: 'video-id',
      originalUrl: sourceUrl,
    })

    assert.deepEqual(result, {
      title: 'Topic · Track',
      author_name: 'Artist One, Jr. · Artist Two',
      album_name: 'Topic Album',
      thumbnail_url: 'https://covers.example/youtube-topic.jpg',
    })
  })
})
