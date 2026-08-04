import 'fake-indexeddb/auto'
import { test } from '@japa/runner'
import {
  ListenLaterItem,
  SearchType,
  type ExternalLink,
} from '../../../../src/domain/music_item.js'
import {
  createListenLaterStorage,
  findDuplicate,
  DB_CONFIG,
  type NewListenLaterItem,
} from '../../../../src/infrastructure/storage/listen_later_storage.js'

/**
 * One store for the whole file: the factory opens a connection lazily and keeps
 * it, so deleting the database between tests would be blocked by that
 * connection. Emptying the list through the interface isolates tests without
 * ever racing a close.
 *
 * The clock is sequenced, one second per write: two items added in the same
 * millisecond sort in an unspecified order, which is what made order assertions
 * flaky when they leaned on real time.
 */
let tick = 0
const storage = createListenLaterStorage(
  indexedDB,
  () => new Date(1_700_000_000_000 + tick++ * 1000)
)

async function emptyList() {
  for (const item of await storage.getAll()) {
    await storage.remove(item.id)
  }
}

function describeItem(overrides: Partial<NewListenLaterItem> = {}): NewListenLaterItem {
  return {
    id: 'test-id',
    title: 'Test Track',
    releaseDate: '2024-01-15',
    artists: ['Test Artist'],
    itemType: SearchType.track,
    albumName: 'Test Album',
    coverArt: 'https://example.com/cover.jpg',
    ...overrides,
  }
}

/**
 * Writes a row the way versions before 2 did: `addedAt` as a migration counter
 * instead of a Date. Only the migration ever produces these, so the store's own
 * `add` cannot.
 */
async function seedLegacyRow(id: string, title: string, addedAt: number) {
  const { promise, resolve, reject } = Promise.withResolvers<IDBDatabase>()
  const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version)
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
  const db = await promise

  const write = Promise.withResolvers<void>()
  const transaction = db.transaction(DB_CONFIG.storeName, 'readwrite')
  transaction.objectStore(DB_CONFIG.storeName).add({
    id,
    title,
    releaseDate: '2020-01-01',
    artists: ['Legacy Artist'],
    itemType: SearchType.track,
    hasBeenListened: false,
    addedAt,
  })
  transaction.oncomplete = () => write.resolve()
  transaction.onerror = () => write.reject(transaction.error)
  await write.promise

  db.close()
}

test.group('Listen Later Storage - writes', (group) => {
  group.each.teardown(emptyList)

  test('add stores the described item and owns addedAt and hasBeenListened', async ({ assert }) => {
    const stored = await storage.add(describeItem({ id: 'add-test-1' }))

    assert.equal(stored.id, 'add-test-1')
    assert.equal(stored.title, 'Test Track')
    assert.deepEqual(stored.artists, ['Test Artist'])
    assert.isFalse(stored.hasBeenListened)
    assert.instanceOf(stored.addedAt, Date)
  })

  test('add keeps sourceUrl and externalLinks', async ({ assert }) => {
    await storage.add(
      describeItem({
        id: 'add-test-2',
        sourceUrl: 'https://open.spotify.com/track/abc',
        externalLinks: [
          {
            platform: 'deezer',
            label: 'Deezer',
            url: 'https://deezer.com/track/1',
            category: 'stream',
            source: 'platform-search',
          },
        ],
      })
    )

    const result = await storage.get('add-test-2')

    assert.equal(result!.sourceUrl, 'https://open.spotify.com/track/abc')
    assert.lengthOf(result!.externalLinks!, 1)
    assert.equal(result!.externalLinks![0].platform, 'deezer')
  })

  test('add defaults externalLinks to an empty array', async ({ assert }) => {
    await storage.add(describeItem({ id: 'add-test-3' }))

    const result = await storage.get('add-test-3')

    assert.deepEqual(result!.externalLinks, [])
  })

  test('add stores a structured-cloneable copy, not the caller object', async ({ assert }) => {
    const artists = ['Kavinsky']
    const input = describeItem({ id: 'add-test-4', artists })

    const stored = await storage.add(input)
    artists.push('Mutated After Save')

    assert.deepEqual(stored.artists, ['Kavinsky'])
    assert.deepEqual((await storage.get('add-test-4'))!.artists, ['Kavinsky'])
  })

  test('remove deletes the item', async ({ assert }) => {
    await storage.add(describeItem({ id: 'remove-test-1' }))

    await storage.remove('remove-test-1')

    assert.isNull(await storage.get('remove-test-1'))
  })

  test('toggleListened flips the flag and returns the updated item', async ({ assert }) => {
    await storage.add(describeItem({ id: 'toggle-test-1' }))

    const listened = await storage.toggleListened('toggle-test-1')
    assert.isTrue(listened!.hasBeenListened)

    const unlistened = await storage.toggleListened('toggle-test-1')
    assert.isFalse(unlistened!.hasBeenListened)
  })

  test('toggleListened persists the new value', async ({ assert }) => {
    await storage.add(describeItem({ id: 'toggle-test-2' }))

    await storage.toggleListened('toggle-test-2')

    assert.isTrue((await storage.get('toggle-test-2'))!.hasBeenListened)
  })

  test('toggleListened returns null for an unknown id', async ({ assert }) => {
    assert.isNull(await storage.toggleListened('non-existent-id'))
  })

  const deezerLink: ExternalLink = {
    platform: 'deezer',
    label: 'Deezer',
    url: 'https://deezer.com/track/1',
    category: 'stream',
    source: 'platform-search',
  }

  test('updateExternalLinks replaces the links and persists them', async ({ assert }) => {
    await storage.add(describeItem({ id: 'links-test-1' }))

    const updated = await storage.updateExternalLinks('links-test-1', [deezerLink])

    assert.isNotNull(updated)
    assert.lengthOf(updated!.externalLinks!, 1)
    assert.equal((await storage.get('links-test-1'))!.externalLinks![0].platform, 'deezer')
  })

  test('updateExternalLinks returns null when the item was removed', async ({ assert }) => {
    assert.isNull(await storage.updateExternalLinks('non-existent-id', [deezerLink]))
  })

  test('get returns null for an unknown id', async ({ assert }) => {
    assert.isNull(await storage.get('non-existent-id'))
  })
})

test.group('Listen Later Storage - reads', (group) => {
  group.each.teardown(emptyList)

  test('getAll returns an empty array when nothing is stored', async ({ assert }) => {
    const results = await storage.getAll()

    assert.isArray(results)
    assert.lengthOf(results, 0)
  })

  test('getAll returns items oldest first', async ({ assert }) => {
    await storage.add(describeItem({ id: 'order-1', title: 'First' }))
    await storage.add(describeItem({ id: 'order-2', title: 'Second' }))
    await storage.add(describeItem({ id: 'order-3', title: 'Third' }))

    const stored = await storage.getAll()
    const titles = stored.map((item) => item.title)

    assert.deepEqual(titles, ['First', 'Second', 'Third'])
  })

  test('getAll sorts regardless of insertion order', async ({ assert }) => {
    // Keys sort before addedAt would, so ids are deliberately reversed.
    await storage.add(describeItem({ id: 'zzz', title: 'First' }))
    await storage.add(describeItem({ id: 'aaa', title: 'Second' }))

    const stored = await storage.getAll()
    const titles = stored.map((item) => item.title)

    assert.deepEqual(titles, ['First', 'Second'])
  })

  test('getAll sorts legacy numeric addedAt before dated items', async ({ assert }) => {
    await storage.add(describeItem({ id: 'modern', title: 'Modern' }))
    await seedLegacyRow('legacy-2', 'Legacy Two', 2)
    await seedLegacyRow('legacy-1', 'Legacy One', 1)

    const stored = await storage.getAll()
    const titles = stored.map((item) => item.title)

    assert.deepEqual(titles, ['Legacy One', 'Legacy Two', 'Modern'])
  })

  test('stores both track and album items', async ({ assert }) => {
    await storage.add(
      describeItem({ id: 'track-type', itemType: SearchType.track, albumName: 'Greatest Hits' })
    )
    await storage.add(
      describeItem({ id: 'album-type', itemType: SearchType.album, title: 'Amazing Album' })
    )

    assert.equal((await storage.get('track-type'))!.itemType, SearchType.track)
    assert.equal((await storage.get('track-type'))!.albumName, 'Greatest Hits')
    assert.equal((await storage.get('album-type'))!.itemType, SearchType.album)
  })

  test('stores multiple artists', async ({ assert }) => {
    await storage.add(
      describeItem({ id: 'multi-artist', artists: ['Artist One', 'Artist Two', 'Artist Three'] })
    )

    const result = await storage.get('multi-artist')

    assert.deepEqual(result!.artists, ['Artist One', 'Artist Two', 'Artist Three'])
  })

  test('stores items without optional fields', async ({ assert }) => {
    await storage.add({
      id: 'no-optionals',
      title: 'Single Track',
      releaseDate: '2024-01-01',
      artists: [],
      itemType: SearchType.track,
    })

    const result = await storage.get('no-optionals')

    assert.isUndefined(result!.coverArt)
    assert.isUndefined(result!.albumName)
    assert.deepEqual(result!.artists, [])
  })
})

test.group('Listen Later Storage - injection', () => {
  test('createListenLaterStorage uses the IDBFactory it is given', async ({ assert }) => {
    const injected = createListenLaterStorage(indexedDB)

    await injected.add(describeItem({ id: 'injected-1' }))
    assert.isNotNull(await injected.get('injected-1'))

    await injected.remove('injected-1')
  })
})

test.group('Listen Later Storage - duplicate rule', () => {
  function item(title: string, artists: string[]): ListenLaterItem {
    return {
      id: `${title}-${artists.join('-')}`,
      title,
      releaseDate: '2024-01-01',
      artists,
      itemType: SearchType.track,
      hasBeenListened: false,
      addedAt: new Date(),
    }
  }

  test('matches on identical title and artist set', ({ assert }) => {
    const items = [item('Nightcall', ['Kavinsky'])]

    const found = findDuplicate(items, 'Nightcall', ['Kavinsky'])

    assert.equal(found!.id, 'Nightcall-Kavinsky')
  })

  test('ignores case and surrounding whitespace', ({ assert }) => {
    const items = [item('Nightcall', ['Kavinsky'])]

    assert.isNotNull(findDuplicate(items, '  NIGHTCALL ', [' kavinsky']))
  })

  test('ignores artist order', ({ assert }) => {
    const items = [item('Nightcall', ['Kavinsky', 'Angèle'])]

    assert.isNotNull(findDuplicate(items, 'Nightcall', ['Angèle', 'Kavinsky']))
  })

  test('a repeated artist name does not make it another version', ({ assert }) => {
    const items = [item('Nightcall', ['Kavinsky', 'Kavinsky'])]

    assert.isNotNull(findDuplicate(items, 'Nightcall', ['Kavinsky']))
  })

  test('a shared title with extra artists is another version, not a duplicate', ({ assert }) => {
    const items = [item('Nightcall', ['Kavinsky'])]

    assert.isNull(findDuplicate(items, 'Nightcall', ['Kavinsky', 'Angèle', 'Phoenix']))
  })

  test('a shared title with fewer artists is another version, not a duplicate', ({ assert }) => {
    const items = [item('Nightcall', ['Kavinsky', 'Angèle', 'Phoenix'])]

    assert.isNull(findDuplicate(items, 'Nightcall', ['Kavinsky']))
  })

  test('same artists but a different title is not a duplicate', ({ assert }) => {
    const items = [item('Nightcall', ['Kavinsky'])]

    assert.isNull(findDuplicate(items, 'Odd Look', ['Kavinsky']))
  })

  test('returns null on an empty list', ({ assert }) => {
    assert.isNull(findDuplicate([], 'Nightcall', ['Kavinsky']))
  })
})
