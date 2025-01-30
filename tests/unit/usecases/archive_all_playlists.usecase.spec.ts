import { SpotifyPlaylistRepository } from '../../../src/infrastructure/repositories/spotify_playlist.repository.js'

class MockSpotifyPlaylistRepository implements SpotifyPlaylistRepository {
  async getCurrentUserPlaylistsInfos(): Promise<PaginatedPlaylistsInfos> {
    return {
      items: [
        {
          id: '1',
          name: 'playlist 1',
          owner: 'owner 1',
          tracks: {
            items: [
              {
                id: '1',
                title: 'track 1',
                link: 'track-link-1',
                artists: ['artist 1'],
              },
              {
                id: '2',
                title: 'track 2',
                link: 'track-link-2',
                artists: ['artist 1', 'artist 2'],
              },
            ],
          },
        },
        {
          id: '2',
          name: 'playlist 2',
          owner: 'owner 2',
          tracks: {
            items: [
              {
                id: '3',
                title: 'track 3',
                link: 'track-link-3',
                artists: ['artist 3'],
              },
              {
                id: '4',
                title: 'track 4',
                link: 'track-link-4',
                artists: ['artist 4', 'artist 5'],
              },
            ],
          },
        },
      ],
    }
  }
}
