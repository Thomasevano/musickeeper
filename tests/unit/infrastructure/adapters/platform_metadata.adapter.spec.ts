import { test } from '@japa/runner'
import { PlatformMetadataAdapter } from '#infrastructure/adapters/platform_metadata.adapter.js'
import { StreamingPlatform } from '#domain/link.js'
import { SearchType } from '#domain/music_item.js'

const originalFetch = globalThis.fetch

test.group('PlatformMetadataAdapter', (group) => {
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('maps oEmbed wire fields to application metadata', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          title: 'Song',
          author_name: 'Artist',
          thumbnail_url: 'https://covers.example/song.jpg',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )

    const result = await new PlatformMetadataAdapter().fetch({
      platform: StreamingPlatform.Spotify,
      type: SearchType.track,
      id: 'track-id',
      originalUrl: 'https://open.spotify.com/track/track-id',
    })

    assert.deepEqual(result, {
      title: 'Song',
      artist: 'Artist',
      thumbnailUrl: 'https://covers.example/song.jpg',
      albumName: undefined,
    })
  })
})
