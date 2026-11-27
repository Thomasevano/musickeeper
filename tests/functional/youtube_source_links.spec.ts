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
            { type: 'streaming', url: { resource: sourceUrl } },
            { type: 'streaming', url: { resource: 'https://music.youtube.com/watch?v=catalog' } },
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
          externalLinks: [
            { platform: 'spotify', url: 'https://open.spotify.com/track/fixture' },
            {
              platform: 'youtube-music',
              url: 'https://music.youtube.com/watch?v=catalog',
              source: 'musicbrainz',
            },
          ],
        })
      }
    })
  }

  const short = 'https://youtu.be/dQw4w9WgXcQ?si=other'
  const canonical = 'https://www.youtube.com/watch?v=9bZkp7q19f0'
  const sameVideo = 'https://youtu.be/Fvr33bVSglE?si=other'
  for (const [name, relations, expected] of [
    ['short first', [short, canonical], [sourceUrl, canonical]],
    ['canonical first', [canonical, short], [sourceUrl, canonical]],
    ['distinct short only', [short], [sourceUrl, short]],
    ['same short with different si', [sameVideo], [sourceUrl]],
    ['duplicate before distinct short', [sameVideo, short], [sourceUrl, short]],
    ['distinct short before duplicate', [short, sameVideo], [sourceUrl, short]],
    [
      'several distinct shorts',
      [sameVideo, short, 'https://youtu.be/9bZkp7q19f0'],
      [sourceUrl, short],
    ],
    ['same video as watch URL', ['https://music.youtube.com/watch?v=Fvr33bVSglE'], [sourceUrl]],
  ] as const) {
    test(`selects YouTube destinations: ${name}`, async ({ client, assert }) => {
      globalThis.fetch = async () =>
        Response.json({
          relations: relations.map((resource) => ({ type: 'streaming', url: { resource } })),
          results: [],
          data: [],
        })
      const response = await client.get('/api/links').qs({
        mbid: '12345678-1234-4234-8234-123456789abc',
        type: 'track',
        artists: 'Fixture Artist',
        title: 'Fixture Track',
        sourceUrl,
      })
      response.assertStatus(200)
      const links: { platform: string; url: string }[] = response.body().externalLinks
      assert.deepEqual(
        links.filter((link) => link.platform === 'youtube-music').map((link) => link.url),
        [...expected]
      )
    })
  }
})
