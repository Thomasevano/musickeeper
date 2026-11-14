import { test } from '@japa/runner'
import { IDBFactory } from 'fake-indexeddb'
import { MusicItemType, SearchType } from '../../../../src/domain/music_item.js'
import {
  createListenLaterStorage,
  DB_CONFIG,
  type NewListenLaterItem,
} from '../../../../src/infrastructure/storage/listen_later_storage.js'

test('playlists round-trip alongside legacy albums and tracks', async ({ assert }) => {
  const factory = new IDBFactory()
  const addedAt = new Date('2025-01-01T00:00:00.000Z')
  const storage = createListenLaterStorage(factory, () => addedAt)
  const playlist: NewListenLaterItem = {
    id: 'playlist-1',
    title: 'A playlist',
    releaseDate: '',
    artists: ['Curator'],
    itemType: MusicItemType.playlist,
    sourceUrl: 'https://example.com/playlist/1',
    externalLinks: [
      {
        platform: 'example',
        label: 'Example',
        url: 'https://example.com/playlist/1',
        category: 'stream',
        source: 'source-url',
      },
    ],
  }

  await storage.add(playlist)

  // Write pre-existing rows directly, including the old numeric addedAt format.
  const opened = Promise.withResolvers<IDBDatabase>()
  const request = factory.open(DB_CONFIG.name, DB_CONFIG.version)
  request.onsuccess = () => opened.resolve(request.result)
  request.onerror = () => opened.reject(request.error)
  const db = await opened.promise
  const written = Promise.withResolvers<void>()
  const transaction = db.transaction(DB_CONFIG.storeName, 'readwrite')
  const store = transaction.objectStore(DB_CONFIG.storeName)
  for (const [id, itemType, time] of [
    ['legacy-album', SearchType.album, 1],
    ['legacy-track', SearchType.track, 2],
  ] as const) {
    store.add({
      id,
      title: id,
      releaseDate: '2020-01-01',
      artists: ['Legacy Artist'],
      itemType,
      addedAt: time,
      hasBeenListened: false,
    })
  }
  transaction.oncomplete = () => written.resolve()
  transaction.onerror = () => written.reject(transaction.error)
  transaction.onabort = () => written.reject(transaction.error)
  await written.promise
  db.close()

  const items = await storage.getAll()
  assert.deepEqual(
    items.map((item) => item.itemType),
    [SearchType.album, SearchType.track, MusicItemType.playlist]
  )
  const restored = await storage.get(playlist.id)
  assert.isNotNull(restored)
  assert.equal(restored!.itemType, MusicItemType.playlist)
  assert.equal(restored!.sourceUrl, playlist.sourceUrl)
  assert.deepEqual(restored!.externalLinks, playlist.externalLinks)
  assert.deepEqual(restored!.artists, playlist.artists)
  assert.equal(restored!.addedAt.getTime(), addedAt.getTime())
  assert.isFalse(restored!.hasBeenListened)
})
