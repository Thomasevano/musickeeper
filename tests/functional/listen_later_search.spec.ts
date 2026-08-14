import app from '@adonisjs/core/services/app'
import { SearchPort } from '#application/ports/search.port.js'
import { CachedSearchAdapter } from '#infrastructure/adapters/cached_search.adapter.js'
import { test } from '@japa/runner'

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
})

test.group('Listen later search caching', () => {
  test('resolves a caching search port so repeated queries skip MusicBrainz', async ({
    assert,
  }) => {
    const searchPort = await app.container.make(SearchPort)

    assert.instanceOf(searchPort, CachedSearchAdapter)
  })
})
