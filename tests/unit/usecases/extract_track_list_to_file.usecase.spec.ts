import { test } from '@japa/runner'
import { Track } from '../../../src/domain/track.js'
import { SpotifyPlaylistRepository } from '../../../src/infrastructure/repositories/spotify_playlist.repository.js'
import { TrackListToFileUsecase } from '../../../src/application/usecases/extract_track_list_to_file.usecase.js'

class MockSpotifyPlaylistRepository extends SpotifyPlaylistRepository {
  async getTracks(playlistUrl: string): Promise<Track[]> {
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
        artists: ['artist 2'],
      }),
    ]
    return playlistTracks
  }
}

test.group('ExtractTrackListToFileUsecase', () => {
  test('it extract a tracklist to a text file', async ({ assert }) => {
    const playlistTracksUrl = 'https://open.spotify.com/playlist/1/tracks'
    const playlistName = 'playlist name'
    const mockSpotifyPlaylistRepository = new MockSpotifyPlaylistRepository()
    const trackListToFileUsecase = new TrackListToFileUsecase(mockSpotifyPlaylistRepository)

    const trackList = await trackListToFileUsecase.execute(playlistTracksUrl, playlistName)

    const expectedTrackList = `track 1 - artist 1\ntrack 2 - artist 2`

    assert.deepEqual(trackList, expectedTrackList)
  })
})
