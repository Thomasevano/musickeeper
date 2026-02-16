import 'fake-indexeddb/auto'
import { test } from '@japa/runner'
import { SearchType } from '../../../../src/domain/music_item.js'
import {
  openDatabase,
  getAllItems,
  getItem,
  addItem,
  removeItem,
  toggleItemListened,
  itemExists,
  getItemCount,
  createListenLaterItem,
  sortListenLaterItems,
  DB_CONFIG,
} from '../../../../src/infrastructure/storage/listen_later_storage.js'

// Helper to create a test MusicItem
function createTestMusicItem(overrides = {}) {
  return {
    id: `test-id-${Date.now()}-${Math.random()}`,
    title: 'Test Track',
    releaseDate: '2024-01-15',
    artists: ['Test Artist'],
    itemType: SearchType.track,
    albumName: 'Test Album',
    coverArt: 'https://example.com/cover.jpg',
    ...overrides,
  }
}

// Clean up IndexedDB between tests
async function cleanupDatabase() {
  const deleteRequest = indexedDB.deleteDatabase(DB_CONFIG.name)
  await new Promise<void>((resolve, reject) => {
    deleteRequest.onsuccess = () => resolve()
    deleteRequest.onerror = () => reject(deleteRequest.error)
  })
}

test.group('Listen Later Storage - Database Operations', (group) => {
  group.each.teardown(async () => {
    await cleanupDatabase()
  })

  test('openDatabase creates and opens the database successfully', async ({ assert }) => {
    const db = await openDatabase()

    assert.isNotNull(db)
    assert.equal(db.name, DB_CONFIG.name)
    assert.equal(db.version, DB_CONFIG.version)
    assert.isTrue(db.objectStoreNames.contains(DB_CONFIG.storeName))

    db.close()
  })

  test('openDatabase creates object store with correct configuration', async ({ assert }) => {
    const db = await openDatabase()

    const transaction = db.transaction(DB_CONFIG.storeName, 'readonly')
    const store = transaction.objectStore(DB_CONFIG.storeName)

    assert.equal(store.keyPath, 'id')
    assert.isTrue(store.autoIncrement)

    db.close()
  })
})

test.group('Listen Later Storage - CRUD Operations', (group) => {
  let db: IDBDatabase

  group.each.setup(async () => {
    db = await openDatabase()
  })

  group.each.teardown(async () => {
    db.close()
    await cleanupDatabase()
  })

  test('addItem adds a music item to the database', async ({ assert }) => {
    const musicItem = createTestMusicItem({ id: 'add-test-1' })

    const result = await addItem(db, musicItem)

    assert.equal(result.id, musicItem.id)
    assert.equal(result.title, musicItem.title)
    assert.equal(result.hasBeenListened, false)
    assert.instanceOf(result.addedAt, Date)
  })

  test('getItem retrieves an item by ID', async ({ assert }) => {
    const musicItem = createTestMusicItem({ id: 'get-test-1' })
    await addItem(db, musicItem)

    const result = await getItem(db, 'get-test-1')

    assert.isNotNull(result)
    assert.equal(result!.id, 'get-test-1')
    assert.equal(result!.title, musicItem.title)
  })

  test('getItem returns null for non-existent item', async ({ assert }) => {
    const result = await getItem(db, 'non-existent-id')

    assert.isNull(result)
  })

  test('getAllItems returns all items sorted by addedAt', async ({ assert }) => {
    const item1 = createTestMusicItem({ id: 'all-test-1', title: 'First' })
    const item2 = createTestMusicItem({ id: 'all-test-2', title: 'Second' })
    const item3 = createTestMusicItem({ id: 'all-test-3', title: 'Third' })

    await addItem(db, item1)
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10))
    await addItem(db, item2)
    await new Promise((resolve) => setTimeout(resolve, 10))
    await addItem(db, item3)

    const results = await getAllItems(db)

    assert.lengthOf(results, 3)
    assert.equal(results[0].title, 'First')
    assert.equal(results[1].title, 'Second')
    assert.equal(results[2].title, 'Third')
  })

  test('getAllItems returns empty array when no items exist', async ({ assert }) => {
    const results = await getAllItems(db)

    assert.isArray(results)
    assert.lengthOf(results, 0)
  })

  test('removeItem deletes an item from the database', async ({ assert }) => {
    const musicItem = createTestMusicItem({ id: 'remove-test-1' })
    await addItem(db, musicItem)

    // Verify item exists
    let exists = await itemExists(db, 'remove-test-1')
    assert.isTrue(exists)

    // Remove item
    await removeItem(db, 'remove-test-1')

    // Verify item is removed
    exists = await itemExists(db, 'remove-test-1')
    assert.isFalse(exists)
  })

  test('toggleItemListened toggles hasBeenListened from false to true', async ({ assert }) => {
    const musicItem = createTestMusicItem({ id: 'toggle-test-1' })
    await addItem(db, musicItem)

    const result = await toggleItemListened(db, 'toggle-test-1')

    assert.isNotNull(result)
    assert.equal(result!.hasBeenListened, true)
  })

  test('toggleItemListened toggles hasBeenListened from true to false', async ({ assert }) => {
    const musicItem = createTestMusicItem({ id: 'toggle-test-2' })
    await addItem(db, musicItem)

    // Toggle to true
    await toggleItemListened(db, 'toggle-test-2')
    // Toggle back to false
    const result = await toggleItemListened(db, 'toggle-test-2')

    assert.isNotNull(result)
    assert.equal(result!.hasBeenListened, false)
  })

  test('toggleItemListened returns null for non-existent item', async ({ assert }) => {
    const result = await toggleItemListened(db, 'non-existent-id')

    assert.isNull(result)
  })

  test('itemExists returns true for existing item', async ({ assert }) => {
    const musicItem = createTestMusicItem({ id: 'exists-test-1' })
    await addItem(db, musicItem)

    const exists = await itemExists(db, 'exists-test-1')

    assert.isTrue(exists)
  })

  test('itemExists returns false for non-existent item', async ({ assert }) => {
    const exists = await itemExists(db, 'non-existent-id')

    assert.isFalse(exists)
  })

  test('getItemCount returns correct count', async ({ assert }) => {
    // Initially empty
    let count = await getItemCount(db)
    assert.equal(count, 0)

    // Add items
    await addItem(db, createTestMusicItem({ id: 'count-test-1' }))
    await addItem(db, createTestMusicItem({ id: 'count-test-2' }))
    await addItem(db, createTestMusicItem({ id: 'count-test-3' }))

    count = await getItemCount(db)
    assert.equal(count, 3)

    // Remove one item
    await removeItem(db, 'count-test-2')

    count = await getItemCount(db)
    assert.equal(count, 2)
  })
})

test.group('Listen Later Storage - Helper Functions', () => {
  test('createListenLaterItem creates item with correct properties', async ({ assert }) => {
    const musicItem = createTestMusicItem({ id: 'helper-test-1' })

    const listenLaterItem = createListenLaterItem(musicItem)

    assert.equal(listenLaterItem.id, musicItem.id)
    assert.equal(listenLaterItem.title, musicItem.title)
    assert.deepEqual(listenLaterItem.artists, musicItem.artists)
    assert.equal(listenLaterItem.hasBeenListened, false)
    assert.instanceOf(listenLaterItem.addedAt, Date)
  })

  test('sortListenLaterItems sorts by Date objects in ascending order', async ({ assert }) => {
    const items = [
      {
        id: '3',
        title: 'Third',
        releaseDate: '2024-01-01',
        artists: ['Artist'],
        itemType: SearchType.track,
        hasBeenListened: false,
        addedAt: new Date('2024-01-03'),
      },
      {
        id: '1',
        title: 'First',
        releaseDate: '2024-01-01',
        artists: ['Artist'],
        itemType: SearchType.track,
        hasBeenListened: false,
        addedAt: new Date('2024-01-01'),
      },
      {
        id: '2',
        title: 'Second',
        releaseDate: '2024-01-01',
        artists: ['Artist'],
        itemType: SearchType.track,
        hasBeenListened: false,
        addedAt: new Date('2024-01-02'),
      },
    ]

    const sorted = sortListenLaterItems(items)

    // Verify exact order - oldest first
    assert.equal(sorted[0].title, 'First')
    assert.equal(sorted[1].title, 'Second')
    assert.equal(sorted[2].title, 'Third')
    
    // Verify it's actually sorted by comparing timestamps
    const firstTime = (sorted[0].addedAt as Date).getTime()
    const secondTime = (sorted[1].addedAt as Date).getTime()
    const thirdTime = (sorted[2].addedAt as Date).getTime()
    assert.isTrue(firstTime < secondTime, 'First item should have earlier timestamp than second')
    assert.isTrue(secondTime < thirdTime, 'Second item should have earlier timestamp than third')
  })
  
  test('sortListenLaterItems returns items in ascending order (oldest first)', async ({ assert }) => {
    // This test uses items that would fail if sort is broken (e.g., reversed or unsorted)
    const oldest = {
      id: 'oldest',
      title: 'Oldest',
      releaseDate: '2024-01-01',
      artists: ['Artist'],
      itemType: SearchType.track,
      hasBeenListened: false,
      addedAt: new Date('2020-01-01'),
    }
    const newest = {
      id: 'newest', 
      title: 'Newest',
      releaseDate: '2024-01-01',
      artists: ['Artist'],
      itemType: SearchType.track,
      hasBeenListened: false,
      addedAt: new Date('2025-01-01'),
    }
    const middle = {
      id: 'middle',
      title: 'Middle',
      releaseDate: '2024-01-01',
      artists: ['Artist'],
      itemType: SearchType.track,
      hasBeenListened: false,
      addedAt: new Date('2022-06-15'),
    }
    
    // Input in random order
    const items = [newest, oldest, middle]
    const sorted = sortListenLaterItems(items)

    // Must be: oldest, middle, newest
    assert.equal(sorted[0].id, 'oldest')
    assert.equal(sorted[1].id, 'middle')
    assert.equal(sorted[2].id, 'newest')
  })

  test('sortListenLaterItems sorts by numeric timestamps (legacy data)', async ({ assert }) => {
    const items = [
      {
        id: '3',
        title: 'Third',
        releaseDate: '2024-01-01',
        artists: ['Artist'],
        itemType: SearchType.track,
        hasBeenListened: false,
        addedAt: 3 as unknown as Date, // Legacy numeric format
      },
      {
        id: '1',
        title: 'First',
        releaseDate: '2024-01-01',
        artists: ['Artist'],
        itemType: SearchType.track,
        hasBeenListened: false,
        addedAt: 1 as unknown as Date, // Legacy numeric format
      },
      {
        id: '2',
        title: 'Second',
        releaseDate: '2024-01-01',
        artists: ['Artist'],
        itemType: SearchType.track,
        hasBeenListened: false,
        addedAt: 2 as unknown as Date, // Legacy numeric format
      },
    ]

    const sorted = sortListenLaterItems(items)

    assert.equal(sorted[0].title, 'First')
    assert.equal(sorted[1].title, 'Second')
    assert.equal(sorted[2].title, 'Third')
  })

  test('sortListenLaterItems handles empty array', async ({ assert }) => {
    const sorted = sortListenLaterItems([])

    assert.isArray(sorted)
    assert.lengthOf(sorted, 0)
  })

  test('sortListenLaterItems does not mutate original array', async ({ assert }) => {
    const items = [
      {
        id: '2',
        title: 'Second',
        releaseDate: '2024-01-01',
        artists: ['Artist'],
        itemType: SearchType.track,
        hasBeenListened: false,
        addedAt: new Date('2024-01-02'),
      },
      {
        id: '1',
        title: 'First',
        releaseDate: '2024-01-01',
        artists: ['Artist'],
        itemType: SearchType.track,
        hasBeenListened: false,
        addedAt: new Date('2024-01-01'),
      },
    ]

    const sorted = sortListenLaterItems(items)

    // Original array should maintain order
    assert.equal(items[0].title, 'Second')
    assert.equal(items[1].title, 'First')

    // Sorted array should be in order
    assert.equal(sorted[0].title, 'First')
    assert.equal(sorted[1].title, 'Second')
  })
})

test.group('Listen Later Storage - Item Types', (group) => {
  let db: IDBDatabase

  group.each.setup(async () => {
    db = await openDatabase()
  })

  group.each.teardown(async () => {
    db.close()
    await cleanupDatabase()
  })

  test('can add and retrieve track items', async ({ assert }) => {
    const trackItem = createTestMusicItem({
      id: 'track-type-test',
      itemType: SearchType.track,
      title: 'My Favorite Song',
      albumName: 'Greatest Hits',
    })

    await addItem(db, trackItem)
    const result = await getItem(db, 'track-type-test')

    assert.isNotNull(result)
    assert.equal(result!.itemType, SearchType.track)
    assert.equal(result!.albumName, 'Greatest Hits')
  })

  test('can add and retrieve album items', async ({ assert }) => {
    const albumItem = createTestMusicItem({
      id: 'album-type-test',
      itemType: SearchType.album,
      title: 'Amazing Album',
      albumName: 'Amazing Album',
    })

    await addItem(db, albumItem)
    const result = await getItem(db, 'album-type-test')

    assert.isNotNull(result)
    assert.equal(result!.itemType, SearchType.album)
    assert.equal(result!.title, 'Amazing Album')
  })

  test('can store items with multiple artists', async ({ assert }) => {
    const multiArtistItem = createTestMusicItem({
      id: 'multi-artist-test',
      artists: ['Artist One', 'Artist Two', 'Artist Three'],
    })

    await addItem(db, multiArtistItem)
    const result = await getItem(db, 'multi-artist-test')

    assert.isNotNull(result)
    assert.deepEqual(result!.artists, ['Artist One', 'Artist Two', 'Artist Three'])
    assert.lengthOf(result!.artists, 3)
  })
})

test.group('Listen Later Storage - Edge Cases', (group) => {
  let db: IDBDatabase

  group.each.setup(async () => {
    db = await openDatabase()
  })

  group.each.teardown(async () => {
    db.close()
    await cleanupDatabase()
  })

  test('handles items without optional coverArt field', async ({ assert }) => {
    const itemWithoutCover = {
      id: 'no-cover-test',
      title: 'No Cover Track',
      releaseDate: '2024-01-01',
      artists: ['Artist'],
      itemType: SearchType.track,
    }

    await addItem(db, itemWithoutCover)
    const result = await getItem(db, 'no-cover-test')

    assert.isNotNull(result)
    assert.isUndefined(result!.coverArt)
  })

  test('handles items without optional albumName field', async ({ assert }) => {
    const itemWithoutAlbum = {
      id: 'no-album-test',
      title: 'Single Track',
      releaseDate: '2024-01-01',
      artists: ['Solo Artist'],
      itemType: SearchType.track,
    }

    await addItem(db, itemWithoutAlbum)
    const result = await getItem(db, 'no-album-test')

    assert.isNotNull(result)
    assert.isUndefined(result!.albumName)
  })

  test('handles empty artists array', async ({ assert }) => {
    const itemWithNoArtists = createTestMusicItem({
      id: 'no-artists-test',
      artists: [],
    })

    await addItem(db, itemWithNoArtists)
    const result = await getItem(db, 'no-artists-test')

    assert.isNotNull(result)
    assert.deepEqual(result!.artists, [])
  })
})
