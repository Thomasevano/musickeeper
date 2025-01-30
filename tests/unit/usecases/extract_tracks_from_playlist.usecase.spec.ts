import { test } from '@japa/runner'
import { ExtractTracksFromPlaylistUseCase } from '../../../src/application/usecases/extract_tracks_from_playlist.usecase.js'
import { MockSpotifyPlaylistRepository } from '../test_helpers.js'

test.group('ExtractTracksFromPlaylistUsecase', () => {
  test('it extract tracks from a playlist', async ({ assert }) => {
    const playlistTracksUrl = 'https://open.spotify.com/playlist/1/tracks'
    const mockSpotifyPlaylistRepository = new MockSpotifyPlaylistRepository()
    const trackListToFileUsecase = new ExtractTracksFromPlaylistUseCase(
      mockSpotifyPlaylistRepository
    )

    const trackList = await trackListToFileUsecase.execute(playlistTracksUrl, 'token')

    const expectedTrackList = `artist 1 - track 1\nartist 1, artist 2 - track 2`

    assert.equal(trackList, expectedTrackList)
  })
})
