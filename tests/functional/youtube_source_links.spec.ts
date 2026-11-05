import { test } from '@japa/runner'

const sourceUrl = 'https://youtu.be/Fvr33bVSglE?si=sTH8gVBiwjJ0MOAe'

// Mock provider transport, retaining the HTTP validator, use case and real adapters.
test.group('YouTube source External Links', (group) => {
  const originalFetch = globalThis.fetch
  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  for (const providerFails of [false, true]) {
    test(`preserves the short source when providers ${providerFails ? 'fail' : 'return links'}`, async ({
      client,
    }) => {
      globalThis.fetch = async () => {
        if (providerFails) throw new Error('Fixture provider unavailable')
        return Response.json({
          relations: [
            {
              type: 'streaming',
              url: { resource: 'https://open.spotify.com/track/fixture' },
            },
          ],
          results: [],
          data: [],
        })
      }

      const response = await client.get('/api/links').qs({
        mbid: '12345678-1234-4234-8234-123456789abc',
        type: 'track',
        artists: 'Fixture Artist',
        title: 'Fixture Track',
        sourceUrl,
      })

      response.assertStatus(200)
      response.assertBodyContains({
        externalLinks: [
          {
            platform: 'youtube-music',
            label: 'YouTube Music',
            url: sourceUrl,
            category: 'stream',
            source: 'source-url',
          },
        ],
      })
      if (!providerFails) {
        response.assertBodyContains({
          externalLinks: [{ platform: 'spotify', url: 'https://open.spotify.com/track/fixture' }],
        })
      }
    })
  }
})
