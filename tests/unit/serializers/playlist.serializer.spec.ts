import { test } from '@japa/runner'
import { SerializePlaylistInfosFromSpotify } from '../../../src/infrastructure/serializers/spotify/playlist.serializer.js'
import { PlaylistInfos } from '../../../src/domain/playlist.js'

test.group('Serialize a User Spotify playlist infos ', async () => {
  test('When owner have a display name', async ({ assert }) => {
    const exampleSpotifyPlaylist: SpotifyApi.PlaylistObjectSimplified = {
      collaborative: false,
      description: 'playlist description',
      external_urls: {
        spotify: 'https://open.spotify.com/playlist/playlist-id',
      },
      href: 'https://api.spotify.com/v1/playlists/playlist-id',
      id: 'playlist-id',
      images: [
        {
          url: 'image-url',
          height: 300,
          width: 300,
        },
      ],
      name: 'playlist-name',
      owner: {
        external_urls: {
          spotify: 'https://open.spotify.com/user',
        },
        href: 'https://api.spotify.com/v1/users',
        id: 'user-id',
        type: 'user',
        uri: 'spotify:user',
        display_name: 'user-name',
      },
      public: true,
      snapshot_id: '',
      tracks: {
        href: 'https://api.spotify.com/v1/playlists/playlist-id/tracks',
        total: 63,
      },
      type: 'playlist',
      uri: 'spotify:playlist:playlist-id',
    }

    const serializedUserplaylistInfos = SerializePlaylistInfosFromSpotify(exampleSpotifyPlaylist)

    const expectedUserPlaylistInfos = new PlaylistInfos({
      id: 'playlist-id',
      title: 'playlist-name',
      description: 'playlist description',
      tracksUrl: 'https://api.spotify.com/v1/playlists/playlist-id/tracks',
      link: 'https://open.spotify.com/playlist/playlist-id',
      imageUrl: 'image-url',
      owner: 'user-name',
      totalTracks: 63
    })

    assert.deepEqual(serializedUserplaylistInfos, expectedUserPlaylistInfos)
  })
  test("When owner doesn't have display name", async ({ assert }) => {
    const exampleSpotifyPlaylist: SpotifyApi.PlaylistObjectSimplified = {
      collaborative: false,
      description: 'playlist description',
      external_urls: {
        spotify: 'https://open.spotify.com/playlist/playlist-id',
      },
      href: 'https://api.spotify.com/v1/playlists/playlist-id',
      id: 'playlist-id',
      images: [
        {
          url: 'image-url',
          height: 300,
          width: 300,
        },
      ],
      name: 'playlist-name',
      owner: {
        external_urls: {
          spotify: 'https://open.spotify.com/user',
        },
        href: 'https://api.spotify.com/v1/users',
        id: 'user-id',
        type: 'user',
        uri: 'spotify:user',
        display_name: undefined,
      },
      public: true,
      snapshot_id: '',
      tracks: {
        href: 'https://api.spotify.com/v1/playlists/playlist-id/tracks',
        total: 63,
      },
      type: 'playlist',
      uri: 'spotify:playlist:playlist-id',
    }

    const serializedUserplaylistInfos = SerializePlaylistInfosFromSpotify(exampleSpotifyPlaylist)

    const expectedUserPlaylistInfos = new PlaylistInfos({
      id: 'playlist-id',
      title: 'playlist-name',
      description: 'playlist description',
      tracksUrl: 'https://api.spotify.com/v1/playlists/playlist-id/tracks',
      link: 'https://open.spotify.com/playlist/playlist-id',
      imageUrl: 'image-url',
      owner: 'user-id',
      totalTracks: 63
    })

    assert.deepEqual(serializedUserplaylistInfos, expectedUserPlaylistInfos)
  })
})
