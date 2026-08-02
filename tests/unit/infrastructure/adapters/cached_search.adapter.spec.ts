import { test } from '@japa/runner'
import { CachedSearchAdapter } from '#infrastructure/adapters/cached_search.adapter.js'
import { SearchPort } from '#application/ports/search.port.js'
import { MusicItem, SearchType } from '#domain/music_item.js'

class CountingSearchAdapter extends SearchPort {
  public calls: Array<{ query: string; type: SearchType; artist?: string }> = []

  async searchItem(query: string, type: SearchType, artist?: string): Promise<MusicItem[]> {
    this.calls.push({ query, type, artist })
    return [
      new MusicItem({
        id: `${query}-${this.calls.length}`,
        title: query,
        releaseDate: '2020-01-01',
        artists: [artist ?? 'Someone'],
        itemType: type,
      }),
    ]
  }
}

function makeClock(start = 0) {
  let current = start
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms
    },
  }
}

test.group('CachedSearchAdapter', () => {
  test('serves a repeated search from cache instead of calling the source', async ({ assert }) => {
    const inner = new CountingSearchAdapter()
    const clock = makeClock()
    const cached = new CachedSearchAdapter(inner, { ttlMs: 60_000, now: clock.now })

    const first = await cached.searchItem('believer', SearchType.track)
    const second = await cached.searchItem('believer', SearchType.track)

    assert.equal(inner.calls.length, 1)
    assert.deepEqual(second, first)
  })

  test('keeps cached results unchanged when callers mutate returned items', async ({ assert }) => {
    const inner = new CountingSearchAdapter()
    const cached = new CachedSearchAdapter(inner, { ttlMs: 60_000, now: makeClock().now })

    const first = await cached.searchItem('believer', SearchType.track)
    first[0].albumName = 'platform album'
    first[0].coverArt = 'platform cover'

    const second = await cached.searchItem('believer', SearchType.track)
    assert.isUndefined(second[0].albumName)
    assert.isUndefined(second[0].coverArt)

    second[0].albumName = 'another album'
    const third = await cached.searchItem('believer', SearchType.track)
    assert.isUndefined(third[0].albumName)
    assert.equal(inner.calls.length, 1)
  })

  test('calls the source again once the entry has outlived its ttl', async ({ assert }) => {
    const inner = new CountingSearchAdapter()
    const clock = makeClock()
    const cached = new CachedSearchAdapter(inner, { ttlMs: 60_000, now: clock.now })

    await cached.searchItem('believer', SearchType.track)
    clock.advance(59_999)
    await cached.searchItem('believer', SearchType.track)
    assert.equal(inner.calls.length, 1)

    clock.advance(2)
    await cached.searchItem('believer', SearchType.track)
    assert.equal(inner.calls.length, 2)
  })

  test('treats query, type and artist as distinct cache keys', async ({ assert }) => {
    const inner = new CountingSearchAdapter()
    const cached = new CachedSearchAdapter(inner, { ttlMs: 60_000, now: makeClock().now })

    await cached.searchItem('believer', SearchType.track)
    await cached.searchItem('believer', SearchType.album)
    await cached.searchItem('believer', SearchType.track, 'imagine dragons')
    await cached.searchItem('other', SearchType.track)

    assert.equal(inner.calls.length, 4)
  })

  test('does not let a differently split query and artist collide', async ({ assert }) => {
    const inner = new CountingSearchAdapter()
    const cached = new CachedSearchAdapter(inner, { ttlMs: 60_000, now: makeClock().now })

    await cached.searchItem('a', SearchType.track, 'b\u0000c')
    await cached.searchItem('a\u0000b', SearchType.track, 'c')

    assert.equal(inner.calls.length, 2)
  })

  test('evicts the oldest entry once maxEntries is exceeded', async ({ assert }) => {
    const inner = new CountingSearchAdapter()
    const cached = new CachedSearchAdapter(inner, {
      ttlMs: 60_000,
      maxEntries: 2,
      now: makeClock().now,
    })

    await cached.searchItem('first', SearchType.track)
    await cached.searchItem('second', SearchType.track)
    await cached.searchItem('third', SearchType.track)
    assert.equal(inner.calls.length, 3)

    // "first" was evicted, so it costs another source call.
    await cached.searchItem('first', SearchType.track)
    assert.equal(inner.calls.length, 4)

    // "third" is still resident.
    await cached.searchItem('third', SearchType.track)
    assert.equal(inner.calls.length, 4)
  })

  test('does not cache a failed search', async ({ assert }) => {
    class FailingOnce extends SearchPort {
      public calls = 0
      async searchItem(): Promise<MusicItem[]> {
        this.calls += 1
        if (this.calls === 1) throw new Error('upstream exploded')
        return []
      }
    }

    const inner = new FailingOnce()
    const cached = new CachedSearchAdapter(inner, { ttlMs: 60_000, now: makeClock().now })

    await assert.rejects(() => cached.searchItem('believer', SearchType.track))
    await cached.searchItem('believer', SearchType.track)

    assert.equal(inner.calls, 2)
  })
})
