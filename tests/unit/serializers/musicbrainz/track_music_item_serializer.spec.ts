import { test } from '@japa/runner'
import { IRecordingMatch } from 'musicbrainz-api'
import { serializeRecordingAsTrackMusicItem } from '../../../../src/infrastructure/serializers/musicbrainz/track_music_item_serializer.js'
import { MusicItem, SearchType } from '../../../../src/domain/music_item.js'

test('Serialize a track from MusicBrainz', async ({ assert }) => {
  const exampleMusicBrainzRecording: IRecordingMatch = {
    'disambiguation': '',
    'id': '026fa041-3917-4c73-9079-ed16e36f20f8',
    'score': 100,
    'title': 'Blow Your Mind (Mwah)',
    'length': 178000,
    'video': false,
    'artist-credit': [
      {
        artist: {
          'id': '6f1a58bf-9b1b-49cf-a44a-6cefad7ae04f',
          'type-id': '',
          'disambiguation': '',
          'type': '',
          'name': 'Dua Lipa',
          'sort-name': 'Lipa, Dua',
        },
        joinphrase: '',
        name: 'Dua Lipa',
      },
    ],
    'first-release-date': '2016-08-26',
    'releases': [
      {
        'barcode': '07599251581',
        'disambiguation': '',
        'asin': '',
        'text-representation': {
          language: 'eng',
          script: 'Latn',
        },
        'quality': 'normal',
        'cover-art-archive': {
          count: 1,
          artwork: false,
          darkened: false,
          front: false,
          back: false,
        },
        'id': '0153f3a0-5dac-4a5e-b503-8df1b3bb002c',
        'status-id': '4e304316-386d-3409-af2e-78857eec5cfe',
        'count': 1,
        'title': 'Blow Your Mind (Mwah) (Remixes)',
        'status': 'Official',
        'artist-credit': [
          {
            name: 'Dua Lipa',
            artist: {
              'id': '6f1a58bf-9b1b-49cf-a44a-6cefad7ae04f',
              'type-id': '',
              'disambiguation': '',
              'type': '',
              'name': 'Dua Lipa',
              'sort-name': 'Lipa, Dua',
            },
            joinphrase: '',
          },
        ],
        'release-group': {
          'id': '4a45bfa5-eb1e-49eb-a20c-1021389b2121',
          'primary-type-id': 'd6038452-8ee0-3f68-affc-2de9a1ede0b9',
          'title': 'Blow Your Mind (Mwah)',
          'primary-type': 'Single',
          'secondary-types': [''],
          'sort-name': '',
          'count': 0,
          'first-release-date': '',
          'artist-credit': [],
        },
        'date': '2016-10-21',
        'country': 'XW',
        'release-events': [
          {
            date: '2016-10-21',
            area: {
              'id': '525d4e18-3d00-31b9-a58b-a146a916de8f',
              'name': '[Worldwide]',
              'sort-name': '[Worldwide]',
              'iso-3166-1-codes': ['XW'],
              'primary': true,
              'disambiguation': '',
              'life-span': {
                ended: true,
                begin: '',
                end: '',
              },
              'type': 'Country',
              'type-id': '',
            },
          },
        ],
        'track-count': 4,
        'media': [
          {
            'position': 1,
            'format': 'Digital Media',
            'tracks': [],
            'title': '',
            'format-id': '',
            'track-offset': 0,
            'track-count': 4,
          },
        ],
      },
    ],
    'isrcs': ['GBAHT1600302', 'GBAHT1600331'],
  }
  const exampleCoverArtUrl =
    'http://coverartarchive.org/release/0153f3a0-5dac-4a5e-b503-8df1b3bb002c/14963972370.jpg'
  const expectedTrackMusicItem: MusicItem = {
    id: '026fa041-3917-4c73-9079-ed16e36f20f8',
    title: 'Blow Your Mind (Mwah)',
    releaseDate: '2016-08-26',
    length: 178000,
    artists: ['Dua Lipa'],
    albumName: 'Blow Your Mind (Mwah) (Remixes)',
    itemType: SearchType.track,
    coverArt: exampleCoverArtUrl,
  }

  const serializedTrackMusicItem = serializeRecordingAsTrackMusicItem(
    exampleMusicBrainzRecording,
    exampleCoverArtUrl
  )

  assert.deepEqual(serializedTrackMusicItem, expectedTrackMusicItem)
})
