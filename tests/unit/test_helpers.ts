import { Track } from '../../src/domain/track.js'
import { SpotifyPlaylistRepository } from '../../src/infrastructure/repositories/spotify/spotify_playlist.repository.js'

export class MockSpotifyPlaylistRepository extends SpotifyPlaylistRepository {
  async getSongsFromPlaylist(): Promise<Track[]> {
    const playlistTracks: Track[] = [
      new Track({
        id: '1',
        title: 'track 1',
        link: 'track-link-1',
        artists: ['artist 1'],
      }),
      new Track({
        id: '2',
        title: 'track 2',
        link: 'track-link-2',
        artists: ['artist 1', 'artist 2'],
      }),
    ]
    return playlistTracks
  }
}
