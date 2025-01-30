import { inject } from '@adonisjs/core'
import JSZip from 'jszip'
import { PlaylistRepository } from '../repositories/playlist.repository.js'
import { NoPlaylistFoundException } from '../exceptions/no_playlist_found.exception.js'
import { PlaylistInfos } from '../../domain/playlist.js'
import { ExtractTracksFromPlaylistUseCase } from './extract_tracks_from_playlist.usecase.js'

@inject()
export class ArchiveAllPlaylistsUseCase {
  constructor(
    private playlistRepository: PlaylistRepository,
    private extractTracksFromPlaylistUseCase: ExtractTracksFromPlaylistUseCase
  ) { }

  async execute(token: string) {
    var zip = new JSZip()
    const { playlistsInfos } = await this.playlistRepository.getCurrentUserPlaylistsInfos(token)

    if (!playlistsInfos) {
      throw new NoPlaylistFoundException()
    }
    let index = 0
    while (index < playlistsInfos.length) {
      const playlist: PlaylistInfos = playlistsInfos[index]

      const REQUEST_INTERVAL = 0
      await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL))

      const playlistTracks = await this.extractTracksFromPlaylistUseCase.execute(
        playlist.getTracksUrl(),
        token
      )

      const fileName =
        (playlist.getTitle()
          ? playlist.getTitle().replace('/', '-')
          : 'untiltled playlist of ' + playlist.getOwner()) + '.txt'

      zip.file(fileName, playlistTracks)
      index++
    }

    return await zip.generateAsync({ type: 'nodebuffer' })
  }
}
