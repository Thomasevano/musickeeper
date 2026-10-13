import { test } from '@japa/runner'
import { PlatformMetadataAdapter } from '#infrastructure/adapters/platform_metadata.adapter.js'
import { StreamingPlatform } from '#domain/link.js'
import { SearchType } from '#domain/music_item.js'

const originalFetch = globalThis.fetch

test.group('PlatformMetadataAdapter', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('keeps an unstructured oEmbed author as a single artist credit', async ({ assert }) => {
    globalThis.fetch = async (input) => {
      if (input.toString() === 'https://open.spotify.com/embed/track/track-id') {
        return new Response(null, { status: 503 })
      }

      return new Response(
        JSON.stringify({
          title: 'Song',
          author_name: 'Artist, Jr. & Family',
          thumbnail_url: 'https://covers.example/song.jpg',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const result = await new PlatformMetadataAdapter().fetch({
      platform: StreamingPlatform.Spotify,
      type: SearchType.track,
      id: 'track-id',
      originalUrl: 'https://open.spotify.com/track/track-id',
    })

    assert.deepEqual(result, {
      title: 'Song',
      artist: 'Artist, Jr. & Family',
      artists: ['Artist, Jr. & Family'],
      thumbnailUrl: 'https://covers.example/song.jpg',
      albumName: undefined,
    })
  })
})
