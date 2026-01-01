import { test } from '@japa/runner'
import { IRecordingMatch } from 'musicbrainz-api'
import { serializeRecordingAsTrackMusicItem } from '../../../../src/infrastructure/serializers/musicbrainz/serialize_recording_as_track.js'
import { MusicItem, SearchType } from '../../../../src/domain/music_item.js'

test('Serialize a track from MusicBrainz', async ({ assert }) => {
  const exampleMusicBrainzRecording: IRecordingMatch = {
    id: '026fa041-3917-4c73-9079-ed16e36f20f8',
    score: 100,
    title :'Blow Your Mind (Mwah)',
    length: 178000,
    video: false,
    'artist-credit': [
    {
"artist": {
            "name": "Dua Lipa",
            "sort-name": "Lipa, Dua"
          },
          name:'Dua Lipa',

    }],
    'artist-credit-id': '4af83e24-f886-35c8-831f-5dde0163a6a0',
    'first-release-date': '2016-08-26',
releases: [
        {
          id: '0153f3a0-5dac-4a5e-b503-8df1b3bb002c',
          'status-id': '4e304316-386d-3409-af2e-78857eec5cfe',
          'artist-credit-id': '4af83e24-f886-35c8-831f-5dde0163a6a0',
          count: 1,
          title: 'Blow Your Mind (Mwah) (Remixes)',
          status: 'Official',
          'artist-credit': [
            {
              name: 'Dua Lipa',
              artist: {
                id: '6f1a58bf-9b1b-49cf-a44a-6cefad7ae04f',
                name: 'Dua Lipa',
                'sort-name': 'Lipa, Dua'
              }
            }
          ],
          'release-group': {
            id: '4a45bfa5-eb1e-49eb-a20c-1021389b2121',
            'type-id': 'd6038452-8ee0-3f68-affc-2de9a1ede0b9',
            'primary-type-id': 'd6038452-8ee0-3f68-affc-2de9a1ede0b9',
            title: 'Blow Your Mind (Mwah)',
            'primary-type': 'Single'
          },
          date: '2016-10-21',
          country: 'XW',
          'release-events': [
            {
              date: '2016-10-21',
              area: {
                id: '525d4e18-3d00-31b9-a58b-a146a916de8f',
                name: '[Worldwide]',
                'sort-name': '[Worldwide]',
                'iso-3166-1-codes': [ 'XW' ]
              }
            }
          ],
          'track-count': 4,
          media: [
            {
              id: '9a35d145-47c2-3aa9-8c14-879a2a6b78ba',
              position: 1,
              format: 'Digital Media',
              track: [
                {
                  id: 'ea5b5a58-cc61-4dfb-a6fb-ba255de0bfe0',
                  number: '4',
                  title: 'Blow Your Mind (Mwah) (Black Saint remix)',
                  length: 335610
                }
              ],
              'track-count': 4,
              'track-offset': 3
            }
          ]
        }
      ],
    // 'releases': [
    //   {
    //     'title': 'Blow Your Mind (Mwah)',
    //     'status-id': '4e304316-386d-3409-af2e-78857eec5cfe',
    //     'status': 'Official',
    //     'release-group': {
    //       'primary-type': 'Single',
    //     },
    //     'date': '2016-08-26',
    //     'country': 'XW',
    //     'release-events': [
    //       {
    //         date: '2016-08-26',
    //         area: {
    //           'id': '525d4e18-3d00-31b9-a58b-a146a916de8f',
    //           'name': '[Worldwide]',
    //           'sort-name': '[Worldwide]',
    //           'iso-3166-1-codes': ['XW'],
    //         },
    //       },
    //     ],
    //     'track-count': 1,
    //     'media': [
    //       {
    //         'position': 1,
    //         'format': 'Digital Media',
    //         'track': [
    //           {
    //             id: '0ef6e647-4aeb-438e-8c8a-50c22c511203',
    //             number: '1',
    //             title: 'Blow Your Mind (Mwah)',
    //             length: 179000,
    //           },
    //         ],
    //         'track-count': 1,
    //         'track-offset': 0,
    //       },
    //     ],
    //   },
    // ],
    'isrcs': [

         'GBAHT1600302',


     'GBAHT1600331',

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

  const serializedTrackMusicItem = serializeRecordingAsTrackMusicItem(exampleMusicBrainzRecording)
const expectedTrackMusicItem: MusicItem = {
id: '026fa041-3917-4c73-9079-ed16e36f20f8',
title: 'Blow Your Mind (Mwah)',
releaseDate: '2016-08-26',
length: 178000,
artists: ['Lynyrd Skynyrd'],
albumName: 'Second Helping',
itemType: SearchType.track,

assert.DeepEqual(serializedTrackMusicItem,expectedTrackMusicItem)
})
