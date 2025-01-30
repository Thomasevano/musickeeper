import { test } from '@japa/runner'
import { serializeTrackInfosFromSpotify } from '../../../src/infrastructure/serializers/spotify/track.serializer.js'
import { Track } from '../../../src/domain/track.js'

test('Serialize a track from Spotify', async ({ assert }) => {
  const exampleSpotifyTrack: SpotifyApi.TrackObjectFull = {
    preview_url: null,
    available_markets: [],
    explicit: false,
    type: 'track',
    album: {
      available_markets: [],
      type: 'album',
      album_type: 'album',
      href: 'https://api.spotify.com/v1/albums/5rtOJsiDDjA9V5306cyTRS',
      id: '5rtOJsiDDjA9V5306cyTRS',
      images: [
        {
          height: 640,
          url: 'https://i.scdn.co/image/ab67616d0000b273bb1c0f2bc558a761eb2d7217',
          width: 640,
        },
        {
          height: 300,
          url: 'https://i.scdn.co/image/ab67616d00001e02bb1c0f2bc558a761eb2d7217',
          width: 300,
        },
        {
          height: 64,
          url: 'https://i.scdn.co/image/ab67616d00004851bb1c0f2bc558a761eb2d7217',
          width: 64,
        },
      ],
      name: 'Second Helping',
      release_date: '1974-04-15',
      release_date_precision: 'day',
      uri: 'spotify:album:5rtOJsiDDjA9V5306cyTRS',
      artists: [
        {
          external_urls: {
            spotify: 'https://open.spotify.com/artist/4MVyzYMgTwdP7Z49wAZHx0',
          },
          href: 'https://api.spotify.com/v1/artists/4MVyzYMgTwdP7Z49wAZHx0',
          id: '4MVyzYMgTwdP7Z49wAZHx0',
          name: 'Lynyrd Skynyrd',
          type: 'artist',
          uri: 'spotify:artist:4MVyzYMgTwdP7Z49wAZHx0',
        },
      ],
      external_urls: {
        spotify: 'https://open.spotify.com/album/5rtOJsiDDjA9V5306cyTRS',
      },
      total_tracks: 11,
    },
    artists: [
      {
        external_urls: {
          spotify: 'https://open.spotify.com/artist/4MVyzYMgTwdP7Z49wAZHx0',
        },
        href: 'https://api.spotify.com/v1/artists/4MVyzYMgTwdP7Z49wAZHx0',
        id: '4MVyzYMgTwdP7Z49wAZHx0',
        name: 'Lynyrd Skynyrd',
        type: 'artist',
        uri: 'spotify:artist:4MVyzYMgTwdP7Z49wAZHx0',
      },
    ],
    disc_number: 1,
    track_number: 1,
    duration_ms: 281147,
    external_ids: {
      isrc: 'USMC17446153',
    },
    external_urls: {
      spotify: 'https://open.spotify.com/track/4CJVkjo5WpmUAKp3R44LNb',
    },
    href: 'https://api.spotify.com/v1/tracks/4CJVkjo5WpmUAKp3R44LNb',
    id: '4CJVkjo5WpmUAKp3R44LNb',
    name: 'Sweet Home Alabama',
    popularity: 2,
    uri: 'spotify:track:4CJVkjo5WpmUAKp3R44LNb',
    is_local: false,
  }

  const serializedTrack = await serializeTrackInfosFromSpotify(exampleSpotifyTrack)

  const expectedTrack = new Track({
    id: '4CJVkjo5WpmUAKp3R44LNb',
    title: 'Sweet Home Alabama',
    link: 'https://api.spotify.com/v1/tracks/4CJVkjo5WpmUAKp3R44LNb',
    artists: ['Lynyrd Skynyrd'],
  })

  assert.deepEqual(serializedTrack, expectedTrack)
})
