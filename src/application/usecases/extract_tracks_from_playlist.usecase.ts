import { inject } from '@adonisjs/core'
import { PlaylistRepository } from '../repositories/playlist.repository.js'
import { Track } from '../../domain/track.js'
import { Artist } from '../../domain/artist.js'

@inject()
export class ExtractTracksFromPlaylistUseCase {
  constructor(private playlistRepository: PlaylistRepository) { }

  async execute(playlistTrackUrl: string, token: string): Promise<string> {
    const tracks = await this.playlistRepository.getSongsFromPlaylist(playlistTrackUrl, token)

    const songList = tracks.map((track: Track) => {
      const artists = track
        .getArtists()
        .map((artistName: Artist['name']) => artistName)
        .join(', ')

      return `${artists} - ${track.getTitle()}`
    })

    return songList.join('\n')
  }
}
