import { test } from '@japa/runner'

test.group('Platform metadata', () => {
  test('returns structured artist names separately from the display credit', async ({
    client,
    assert,
  }) => {
    const id = '69kOkLUCkxIZYexIgSG8rq'
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString())
      if (url.hostname !== 'open.spotify.com') return originalFetch(input, init)

      if (url.pathname === '/oembed') {
        return Response.json({ title: 'Track', author_name: 'Artist One, Jr. & Artist Two' })
      }
      if (url.pathname === `/embed/track/${id}`) {
        const entity = { artists: [{ name: 'Artist One, Jr.' }, { name: 'Artist Two' }] }
        const data = { props: { pageProps: { state: { data: { entity } } } } }
        return new Response(
          `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>`
        )
      }
      throw new Error(`Unexpected Spotify request: ${url}`)
    }

    try {
      const response = await client
        .post('/api/platform-metadata')
        .json({ url: `https://open.spotify.com/track/${id}` })

      response.assertStatus(200)
      assert.deepEqual(response.body().musicItem.artists, ['Artist One, Jr.', 'Artist Two'])
      assert.equal(response.body().linkMetadata.artist, 'Artist One, Jr. & Artist Two')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
