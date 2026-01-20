import { test } from '@japa/runner'
import { IReleaseMatch } from 'musicbrainz-api'
import { serializeReleaseAsAlbumMusicItem } from '../../../../src/infrastructure/serializers/musicbrainz/album_music_item_serializer.js'
import { MusicItem, SearchType } from '../../../../src/domain/music_item.js'

test('Serialize a release from MusicBrainz as an Album', async ({ assert }) => {
  const exampleMusicBrainzRelease: IReleaseMatch = {
    'id': '62d1c4ef-fc00-37af-8df7-485f6a31fcc4',
    'score': 100,
    'count': 1,
    'title': 'Fred Schneider & The Shake Society',
    'status-id': '4e304316-386d-3409-af2e-78857eec5cfe',
    'status': 'Official',
    'packaging': 'Cardboard/Paper Sleeve',
    'disambiguation': '',
    'asin': '',
    'quality': 'normal',
    'cover-art-archive': {
      count: 1,
      artwork: false,
      darkened: false,
      front: false,
      back: false,
    },
    'text-representation': {
      language: 'eng',
      script: 'Latn',
    },
    'artist-credit': [
      {
        artist: {
          'id': '43bcca8b-9edc-4997-8343-122350e790bf',
          'name': 'Fred Schneider',
          'sort-name': 'Schneider, Fred',
          'aliases': [],
          'type': '',
          'type-id': '',
          'disambiguation': '',
        },
        name: '',
        joinphrase: '',
      },
    ],
    'release-group': {
      'count': 0,
      'title': '',
      'id': '0ef97d52-3f00-31bf-8413-f83ccb362675',
      'primary-type': 'Album',
      'secondary-types': [''],
      'sort-name': '',
      'first-release-date': '',
      'artist-credit': [],
    },
    'date': '1984',
    'country': 'US',
    'release-events': [
      {
        date: '1984',
        area: {
          'id': '489ce91b-6658-3307-9877-795b68554c98',
          'name': 'United States',
          'sort-name': 'United States',
          'iso-3166-1-codes': ['US'],
          'type': 'Country',
          'type-id': '',
          'disambiguation': '',
          'primary': true,
          'life-span': {
            end: '',
            begin: '',
            ended: true,
          },
        },
      },
    ],
    'barcode': '07599251581',
    'track-count': 9,
    'media': [
      {
        'format': '12" Vinyl',
        'track-count': 9,
        'title': '',
        'tracks': [],
        'format-id': '',
        'track-offset': 0,
        'position': 0,
      },
    ],
  }

  const exampleCoverArtUrl = undefined

  const expectedAlbumMusicItem: MusicItem = {
    id: '62d1c4ef-fc00-37af-8df7-485f6a31fcc4',
    title: 'Fred Schneider & The Shake Society',
    releaseDate: '1984',
    artists: ['Fred Schneider'],
    albumName: 'Fred Schneider & The Shake Society',
    itemType: SearchType.album,
    length: undefined,
    coverArt: '../../../../resources/images/Blank_album.svg',
  }

  const serializedAlbumMusicItem = serializeReleaseAsAlbumMusicItem(
    exampleMusicBrainzRelease,
    exampleCoverArtUrl
  )

  assert.deepEqual(serializedAlbumMusicItem, expectedAlbumMusicItem)
})
