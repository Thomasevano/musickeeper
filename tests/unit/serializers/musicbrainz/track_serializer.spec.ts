import { test } from '@japa/runner'
import { IRecording, IRecordingMatch } from 'musicbrainz-api'

test('Serialize a track from MusicBrainz', async ({ assert }) => {
  const exampleMusicBrainzTrack: IRecordingMatch = {
    'id': '026fa041-3917-4c73-9079-ed16e36f20f8',
    'score': '100',
    'title': 'Blow Your Mind (Mwah)',
    'length': 178000,
    'video': null,
    'artist-credit': [
      {
        artist: {
          'id': '6f1a58bf-9b1b-49cf-a44a-6cefad7ae04f',
          'name': 'Dua Lipa',
          'sort-name': 'Lipa, Dua',
        },
      },
    ],
    'artist-credit-id': '4af83e24-f886-35c8-831f-5dde0163a6a0',
    'first-release-date': '2016-08-26',
    'releases': [
      {
        'id': '383be31c-37a0-4e08-8cda-cbcbbc587ae5',
        'title': 'Blow Your Mind (Mwah)',
        'status-id': '4e304316-386d-3409-af2e-78857eec5cfe',
        'status': 'Official',
        'release-group': {
          'id': '4a45bfa5-eb1e-49eb-a20c-1021389b2121',
          'primary-type': 'Single',
        },
        'date': '2016-08-26',
        'country': 'XW',
        'release-events': [
          {
            date: '2016-08-26',
            area: {
              'id': '525d4e18-3d00-31b9-a58b-a146a916de8f',
              'name': '[Worldwide]',
              'sort-name': '[Worldwide]',
              'iso-3166-1-codes': ['XW'],
            },
          },
        ],
        'track-count': 1,
        'media': [
          {
            'position': 1,
            'format': 'Digital Media',
            'track': [
              {
                id: '0ef6e647-4aeb-438e-8c8a-50c22c511203',
                number: '1',
                title: 'Blow Your Mind (Mwah)',
                length: 179000,
              },
            ],
            'track-count': 1,
            'track-offset': 0,
          },
        ],
      },
    ],
    'isrcs': [
      {
        id: 'GBAHT1600302',
      },
      {
        id: 'GBAHT1600331',
      },
    ],
    'tags': [
      {
        count: 1,
        name: 'electropop',
      },
      {
        count: 1,
        name: 'dance-pop',
      },
      {
        count: 1,
        name: 'contemporary r&b',
      },
    ],
  }
})
