import { test } from '@japa/runner'
import { MusicItem, ListenLaterItem, SearchType } from '../../../src/domain/music_item.js'

test.group('MusicItem', () => {
  test('creates a MusicItem with all required properties', async ({ assert }) => {
    const props = {
      id: 'test-id-123',
      title: 'Test Track',
      releaseDate: '2024-01-15',
      artists: ['Artist 1', 'Artist 2'],
      itemType: SearchType.track,
    }

    const musicItem = new MusicItem(props)

    assert.equal(musicItem.id, 'test-id-123')
    assert.equal(musicItem.title, 'Test Track')
    assert.equal(musicItem.releaseDate, '2024-01-15')
    assert.deepEqual(musicItem.artists, ['Artist 1', 'Artist 2'])
    assert.equal(musicItem.itemType, SearchType.track)
  })

  test('creates a MusicItem with optional properties', async ({ assert }) => {
    const props = {
      id: 'test-id-456',
      title: 'Test Album',
      releaseDate: '2023-06-20',
      artists: ['Album Artist'],
      itemType: SearchType.album,
      length: 3600,
      albumName: 'My Album',
      coverArt: 'https://example.com/cover.jpg',
    }

    const musicItem = new MusicItem(props)

    assert.equal(musicItem.length, 3600)
    assert.equal(musicItem.albumName, 'My Album')
    assert.equal(musicItem.coverArt, 'https://example.com/cover.jpg')
  })

  test('creates a MusicItem with undefined optional properties', async ({ assert }) => {
    const props = {
      id: 'test-id-789',
      title: 'Minimal Track',
      releaseDate: '2022-12-01',
      artists: ['Solo Artist'],
      itemType: SearchType.track,
    }

    const musicItem = new MusicItem(props)

    assert.isUndefined(musicItem.length)
    assert.isUndefined(musicItem.albumName)
    assert.isUndefined(musicItem.coverArt)
  })

  test('handles empty artists array', async ({ assert }) => {
    const props = {
      id: 'test-id-empty',
      title: 'Unknown Track',
      releaseDate: '2024-01-01',
      artists: [],
      itemType: SearchType.track,
    }

    const musicItem = new MusicItem(props)

    assert.deepEqual(musicItem.artists, [])
    assert.equal(musicItem.artists.length, 0)
  })
})

test.group('ListenLaterItem', () => {
  test('creates a ListenLaterItem extending MusicItem', async ({ assert }) => {
    const addedDate = new Date('2024-01-15T10:30:00Z')
    const props = {
      id: 'listen-later-id-123',
      title: 'Track to Listen Later',
      releaseDate: '2023-05-10',
      artists: ['Favorite Artist'],
      itemType: SearchType.track,
      hasBeenListened: false,
      addedAt: addedDate,
    }

    const listenLaterItem = new ListenLaterItem(props)

    // Check inherited properties
    assert.equal(listenLaterItem.id, 'listen-later-id-123')
    assert.equal(listenLaterItem.title, 'Track to Listen Later')
    assert.equal(listenLaterItem.releaseDate, '2023-05-10')
    assert.deepEqual(listenLaterItem.artists, ['Favorite Artist'])
    assert.equal(listenLaterItem.itemType, SearchType.track)

    // Check ListenLaterItem specific properties
    assert.equal(listenLaterItem.hasBeenListened, false)
    assert.deepEqual(listenLaterItem.addedAt, addedDate)
  })

  test('creates a ListenLaterItem with hasBeenListened true', async ({ assert }) => {
    const addedDate = new Date('2024-02-20T14:00:00Z')
    const props = {
      id: 'listened-id-456',
      title: 'Already Listened Album',
      releaseDate: '2022-08-15',
      artists: ['Rock Band'],
      itemType: SearchType.album,
      albumName: 'Greatest Hits',
      coverArt: 'https://example.com/album-cover.jpg',
      hasBeenListened: true,
      addedAt: addedDate,
    }

    const listenLaterItem = new ListenLaterItem(props)

    assert.equal(listenLaterItem.hasBeenListened, true)
    assert.equal(listenLaterItem.albumName, 'Greatest Hits')
    assert.equal(listenLaterItem.coverArt, 'https://example.com/album-cover.jpg')
  })

  test('ListenLaterItem is an instance of MusicItem', async ({ assert }) => {
    const props = {
      id: 'instance-test-id',
      title: 'Instance Test',
      releaseDate: '2024-03-01',
      artists: ['Test Artist'],
      itemType: SearchType.track,
      hasBeenListened: false,
      addedAt: new Date(),
    }

    const listenLaterItem = new ListenLaterItem(props)

    assert.instanceOf(listenLaterItem, ListenLaterItem)
    assert.instanceOf(listenLaterItem, MusicItem)
  })

  test('creates ListenLaterItem with all optional MusicItem properties', async ({ assert }) => {
    const addedDate = new Date()
    const props = {
      id: 'full-props-id',
      title: 'Full Properties Track',
      releaseDate: '2024-04-15',
      length: 240,
      artists: ['Artist A', 'Artist B', 'Artist C'],
      albumName: 'Collaboration Album',
      itemType: SearchType.track,
      coverArt: 'https://example.com/collab-cover.png',
      hasBeenListened: false,
      addedAt: addedDate,
    }

    const listenLaterItem = new ListenLaterItem(props)

    assert.equal(listenLaterItem.length, 240)
    assert.equal(listenLaterItem.albumName, 'Collaboration Album')
    assert.equal(listenLaterItem.coverArt, 'https://example.com/collab-cover.png')
    assert.deepEqual(listenLaterItem.artists, ['Artist A', 'Artist B', 'Artist C'])
  })
})

test.group('SearchType', () => {
  test('SearchType enum has album value', async ({ assert }) => {
    assert.equal(SearchType.album, 'album')
  })

  test('SearchType enum has track value', async ({ assert }) => {
    assert.equal(SearchType.track, 'track')
  })
})
