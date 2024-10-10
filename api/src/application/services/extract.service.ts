import { PlaylistRepository } from '../repositories/playlist.repository.js'
import { NoPlaylistFoundException } from '../exceptions/no_playlist_found.exception.js'

export class ExtractService {
  constructor(private playlistRepository: PlaylistRepository) { }

  async extract(): Promise<void> {
    const playlists = await this.playlistRepository.getCurrentUserPlaylists()

    if (!playlists) {
      throw new NoPlaylistFoundException()
    }
  }
}
