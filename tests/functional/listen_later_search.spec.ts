import app from '@adonisjs/core/services/app'
import { SearchPort } from '#application/ports/search.port.js'
import { test } from '@japa/runner'
import { MusicItem, SearchType } from '#domain/music_item.js'
import { GetExternalLinksUseCase } from '#application/use-cases/get_external_links.use_case.js'
import { MusicBrainzExternalLinksPort } from '#application/ports/musicbrainz_external_links.port.js'
import { PlatformSearchPort } from '#application/ports/platform_search.port.js'

test.group('Listen later search', () => {
  test('rejects an unsupported search type before searching', async ({ client }) => {
    const response = await client.get('/library/listen-later').qs({
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

  test('accepts unmatched items and retains original source and platform-search links', async ({
    client,
    assert,
    cleanup,
  }) => {
    let musicBrainzCalls = 0
    class Catalog extends MusicBrainzExternalLinksPort {
      async fetchExternalLinks() {
        musicBrainzCalls++
        return []
      }
    }
    class Platforms extends PlatformSearchPort {
      async search() {
        return [
          {
            platform: 'qobuz',
            label: 'Qobuz',
            category: 'buy' as const,
            url: 'https://www.qobuz.com/fr-fr/album/song/1',
            source: 'platform-search' as const,
          },
        ]
      }
    }
    app.container.swap(
      GetExternalLinksUseCase,
      () => new GetExternalLinksUseCase(new Catalog(), new Platforms())
    )
    cleanup(() => app.container.restore(GetExternalLinksUseCase))
    const sourceUrl = 'https://open.spotify.com/track/original'
    const response = await client
      .get('/api/links')
      .qs({ type: 'track', title: 'Song', artists: 'Artist', sourceUrl })
    response.assertStatus(200)
    assert.equal(musicBrainzCalls, 0)
    assert.sameDeepMembers(
      response.body().externalLinks.map((link: { platform: string; url: string }) => ({
        platform: link.platform,
        url: link.url,
      })),
      [
        { platform: 'qobuz', url: 'https://www.qobuz.com/fr-fr/album/song/1' },
        { platform: 'spotify', url: sourceUrl },
      ]
    )
  })

  test('matched links retain the source and distinct catalog relation on the same platform', async ({
    client,
    assert,
    cleanup,
  }) => {
    const mbid = '12345678-1234-4234-8234-123456789abc'
    const sourceUrl = 'https://open.spotify.com/track/original'
    const catalogUrl = 'https://open.spotify.com/track/matched'
    let requestedId: string | undefined
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
      async search() {
        return []
      }
    }
    app.container.swap(
      GetExternalLinksUseCase,
      () => new GetExternalLinksUseCase(new Catalog(), new Platforms())
    )
    cleanup(() => app.container.restore(GetExternalLinksUseCase))
    const response = await client
      .get('/api/links')
      .qs({ mbid, type: 'track', title: 'Song', artists: 'Artist', sourceUrl })
    response.assertStatus(200)
    assert.equal(requestedId, mbid)
    assert.sameDeepMembers(
      response.body().externalLinks.map((link: { url: string }) => link.url),
      [sourceUrl, catalogUrl]
    )
  })
})
