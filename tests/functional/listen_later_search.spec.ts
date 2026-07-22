import { test } from '@japa/runner'

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
})
