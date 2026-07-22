import { test } from '@japa/runner'
import { PlatformSearchAdapter } from '#infrastructure/adapters/platform_search/platform_search.adapter.js'
import { SearchType } from '#domain/music_item.js'

const deezerResult = {
  platform: 'deezer',
  label: 'Deezer',
  url: 'https://www.deezer.com/track/1',
  category: 'stream' as const,
  confidence: 'high' as const,
}

test.group('PlatformSearchAdapter', () => {
  test('keeps successful client results when another client rejects', async ({ assert }) => {
    const adapter = new PlatformSearchAdapter(
      { search: async () => [deezerResult] },
      { search: async () => Promise.reject(new Error('Apple unavailable')) },
      { search: async () => [] },
      { search: async () => [] }
    )

    const result = await adapter.search(['Artist'], 'Song', SearchType.track)

    assert.deepEqual(result, [
      {
        platform: 'deezer',
        label: 'Deezer',
        url: 'https://www.deezer.com/track/1',
        category: 'stream',
        source: 'platform-search',
      },
    ])
  })
})
