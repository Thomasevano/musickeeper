import { test } from '@japa/runner'
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

  test('uses structured iTunes metadata for an Apple Music track', async ({ assert }) => {
    globalThis.fetch = async (input) => {
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
              artistName: 'Artist Name',
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
      originalUrl: 'https://music.apple.com/us/album/album-name/album-id?i=track-id',
    })

    assert.deepEqual(result, {
      title: 'Track Name',
      author_name: 'Artist Name',
      album_name: 'Album Name',
      thumbnail_url: 'https://covers.example/600x600bb.jpg',
    })
  })

  test('falls back to Apple Music oEmbed when iTunes has no result', async ({ assert }) => {
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
            author_name: 'Fallback Artist on Apple Music',
            thumbnail_url: 'https://covers.example/fallback.jpg',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      throw new Error(`Unexpected request: ${url}`)
    }

    const result = await fetchAppleMusicMetadata({
      platform: StreamingPlatform.AppleMusic,
      type: SearchType.track,
      id: 'track-id',
      originalUrl: 'https://music.apple.com/us/song/fallback-track/track-id',
    })

    assert.deepEqual(result, {
      title: 'Fallback Track',
      author_name: 'Fallback Artist',
      thumbnail_url: 'https://covers.example/fallback.jpg',
    })
  })

  test('falls back to Apple Music HTML when structured endpoints fail', async ({ assert }) => {
    const sourceUrl = 'https://music.apple.com/us/song/html-track/track-id'

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
        return new Response(
          [
            '<meta property=\"og:title\" content=\"HTML Track - HTML Artist on Apple Music\">',
            '<meta property=\"og:image\" content=\"https://covers.example/html.jpg\">',
          ].join(''),
          { status: 200, headers: { 'Content-Type': 'text/html' } }
        )
      }

      throw new Error(`Unexpected request: ${url}`)
    }

    const result = await fetchAppleMusicMetadata({
      platform: StreamingPlatform.AppleMusic,
      type: SearchType.track,
      id: 'track-id',
      originalUrl: sourceUrl,
    })

    assert.deepEqual(result, {
      title: 'HTML Track',
      author_name: 'HTML Artist',
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

  test('enriches incomplete Spotify oEmbed metadata from HTML', async ({ assert }) => {
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
          '<meta property=\"og:description\" content=\"Fallback Artist · Fallback Album · Track · 2026\">',
          { status: 200, headers: { 'Content-Type': 'text/html' } }
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
      author_name: 'Fallback Artist',
      album_name: 'Fallback Album',
      thumbnail_url: 'https://covers.example/spotify.jpg',
    })
  })

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

  test('replaces YouTube Topic authors with artists from the video description', async ({
    assert,
  }) => {
    const sourceUrl = 'https://music.youtube.com/watch?v=video-id'
    const description = [
      'Provided to YouTube by Label',
      '',
      'Topic Track · Artist One · Artist Two',
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
            title: 'Topic Track',
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
      title: 'Topic Track',
      author_name: 'Artist One, Artist Two',
      album_name: 'Topic Album',
      thumbnail_url: 'https://covers.example/youtube-topic.jpg',
    })
  })
})
