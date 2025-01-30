import { PlaylistRepository } from '../repositories/playlist.repository.js'
import { NoPlaylistFoundException } from '../exceptions/no_playlist_found.exception.js'
import { inject } from '@adonisjs/core'
import { PlaylistInfos } from '../../domain/playlist.js'
import { Track } from '../../domain/track.js'

@inject()
export class ExtractService {
  constructor(private playlistRepository: PlaylistRepository) { }

  async generateAllPlaylists(token: string) {
    const { playlistsInfos } = await this.playlistRepository.getCurrentUserPlaylistsInfos(token)

    if (!playlistsInfos) {
      throw new NoPlaylistFoundException()
    }
    let downloads: { fileName: string; playlistTracks: Track[] }[] = []
    let index = 0
    while (index < playlistsInfos.length) {
      const playlist: PlaylistInfos = playlistsInfos[index]

      const REQUEST_INTERVAL = 0
      await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL))

      const playlistTracks = await this.playlistRepository.getSongsFromPlaylist(
        playlist.getTracksUrl(),
        token
      )
      const fileName =
        (playlist.getTitle()
          ? playlist.getTitle().replace('/', '-')
          : 'untiltled playlist of ' + playlist.getOwner()) + '.txt'

      downloads.push({ fileName, playlistTracks })
      index++
    }
    return downloads
  }
}
