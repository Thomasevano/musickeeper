import app from '@adonisjs/core/services/app'
import { SearchPort } from '#application/ports/search.port.js'
import { test } from '@japa/runner'
import { MusicItem, SearchType } from '#domain/music_item.js'
import { GetExternalLinksUseCase } from '#application/use-cases/get_external_links.use_case.js'
import { MusicBrainzExternalLinksPort } from '#application/ports/musicbrainz_external_links.port.js'
import { PlatformSearchPort } from '#application/ports/platform_search.port.js'

test.group('Listen later search', () => {
  test('rejects an unsupported search type before searching', async ({ client }) => {
    const response = await client
      .get('/library/listen-later')
      .header('Accept', 'application/json')
      .qs({
        q: 'Song',
        type: 'invalid',
      })

    response.assertStatus(422)
    response.assertBodyContains({
      errors: [{ field: 'type', rule: 'enum' }],
    })
  })

  test('returns all candidate recordings without selecting one', async ({
    client,
    cleanup,
    assert,
  }) => {
    const items = ['First recording', 'Second recording'].map(
      (title, index) =>
        new MusicItem({
          id: 'recording-' + index,
          title,
          artists: ['Artist'],
          releaseDate: '',
          itemType: SearchType.track,
        })
    )
    class Candidates extends SearchPort {
      async searchItem() {
        return items
      }
    }
    app.container.swap(SearchPort, () => new Candidates())
    cleanup(() => app.container.restore(SearchPort))
    const response = await client.get('/library/listen-later').qs({ q: 'Song', type: 'track' })
    response.assertStatus(200)
    assert.deepEqual(
      response.body().serializedItems.map((item: { id: string; title: string }) => ({
        id: item.id,
        title: item.title,
      })),
      [
        { id: 'recording-0', title: 'First recording' },
        { id: 'recording-1', title: 'Second recording' },
      ]
    )
  })
})

test.group('External links', () => {
  test('rejects a malformed provided MusicBrainz association', async ({ client }) => {
    const response = await client.get('/api/links').qs({
      mbid: 'not-a-musicbrainz-id',
      type: 'track',
    })

    response.assertStatus(422)
    response.assertBodyContains({
      errors: [{ field: 'mbid', rule: 'uuid' }],
    })
  })

  test('rejects an artist map instead of an artist credit or array', async ({ client }) => {
    const query = new URLSearchParams({ 'type': 'track', 'artists[name]': 'Tyler, the Creator' })
    const response = await client.get(`/api/links?${query}`)

    response.assertStatus(422)
    response.assertBodyContains({
      errors: [{ field: 'artists', rule: 'unionOfTypes' }],
    })
  })

  test('matches legacy scalar and array collaborations without splitting a literal array credit', async ({
    client,
    assert,
    cleanup,
  }) => {
    const sourceUrl = 'https://open.spotify.com/track/original'
    const deezerUrl = 'https://www.deezer.com/track/1'
    const originalFetch = globalThis.fetch
    let musicBrainzCalls = 0
    globalThis.fetch = async (input) => {
      const url = new URL(input instanceof Request ? input.url : input.toString())
      if (url.hostname === 'musicbrainz.org') musicBrainzCalls++
      if (url.hostname === 'api.deezer.com' && url.pathname === '/search') {
        return Response.json({
          data: [{ title: 'Song', artist: { name: 'DJ The Creator' }, link: deezerUrl }],
        })
      }
      return new Response(null, { status: 404 })
    }
    cleanup(() => {
      globalThis.fetch = originalFetch
    })

    const scalar = new URLSearchParams({ artists: 'Tyler, The Creator' })
    const collaboration = new URLSearchParams([
      ['artists[]', 'Tyler'],
      ['artists[]', 'The Creator'],
    ])
    const literal = new URLSearchParams({ 'artists[]': 'Tyler, The Creator' })

    for (const { query, expectedUrls } of [
      { query: scalar, expectedUrls: [sourceUrl, deezerUrl] },
      { query: collaboration, expectedUrls: [sourceUrl, deezerUrl] },
      { query: literal, expectedUrls: [sourceUrl] },
    ]) {
      query.set('type', 'track')
      query.set('title', 'Song')
      query.set('sourceUrl', sourceUrl)
      const response = await client.get(`/api/links?${query}`)
      response.assertStatus(200)
      assert.sameMembers(
        response.body().externalLinks.map((link: { url: string }) => link.url),
        expectedUrls,
        query.toString()
      )
    }
    assert.equal(musicBrainzCalls, 0)
  })

  test('matched links retain distinct same-platform links and pass each artist credit intact', async ({
    client,
    assert,
    cleanup,
  }) => {
    const mbid = '12345678-1234-4234-8234-123456789abc'
    const sourceUrl = 'https://open.spotify.com/track/original'
    const catalogUrl = 'https://open.spotify.com/track/matched'
    let requestedId: string | undefined
    let requestedArtists: string[] | undefined
    class Catalog extends MusicBrainzExternalLinksPort {
      async fetchExternalLinks(id: string) {
        requestedId = id
        return [
          {
            platform: 'spotify',
            label: 'Spotify',
            category: 'stream' as const,
            url: catalogUrl,
            source: 'musicbrainz' as const,
          },
        ]
      }
    }
    class Platforms extends PlatformSearchPort {
      async search(artists: string[]) {
        requestedArtists = artists
        return []
      }
    }
    app.container.swap(
      GetExternalLinksUseCase,
      () => new GetExternalLinksUseCase(new Catalog(), new Platforms())
    )
    cleanup(() => app.container.restore(GetExternalLinksUseCase))
    const query = new URLSearchParams({ mbid, type: 'track', title: 'Song', sourceUrl })
    query.append('artists[]', 'Tyler, the Creator')
    query.append('artists[]', 'Earth, Wind & Fire')
    const response = await client.get(`/api/links?${query}`)
    response.assertStatus(200)
    assert.equal(requestedId, mbid)
    assert.deepEqual(requestedArtists, ['Tyler, the Creator', 'Earth, Wind & Fire'])
    assert.sameDeepMembers(
      response.body().externalLinks.map((link: { url: string }) => link.url),
      [sourceUrl, catalogUrl]
    )
  })
})
