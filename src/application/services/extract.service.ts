import { PlaylistRepository } from '../repositories/playlist.repository.js'
import { NoPlaylistFoundException } from '../exceptions/no_playlist_found.exception.js'
import { inject } from '@adonisjs/core'
import { PlaylistInfos } from '../../domain/playlist.js'

@inject()
export class ExtractService {
  constructor(private playlistRepository: PlaylistRepository) { }

  async generateAllPlaylists(token: string) {
    const { playlistsInfos } = await this.playlistRepository.getCurrentUserPlaylistsInfos(token)

    if (!playlistsInfos) {
      throw new NoPlaylistFoundException()
    }
    let downloads: { fileName: string; playlistTracks: Array<string> }[] = []
    let index = 0
    while (index < playlistsInfos.length) {
      const playlist: PlaylistInfos = playlistsInfos[index]

      const REQUEST_INTERVAL = 0
      await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL))

      const playlistTracks = await this.generateTracksFromPlaylist(playlist.getTracksUrl(), token)
      const fileName =
        (playlist.getTitle()
          ? playlist.getTitle().replace('/', '-')
          : 'untiltled playlist of ' + playlist.getOwner()) + '.txt'

      downloads.push({ fileName, playlistTracks })
      index++
    }
    return downloads
  }

  async generateTracksFromPlaylist(playlistTracksUrl: string, token: string) {
    let url = playlistTracksUrl
    let result: SpotifyApi.PlaylistObjectSimplified =
      await this.playlistRepository.getSongsFromPlaylist(url, token)

    let nextUrl = result.next
    const totalItems = result.total
    const tracks: Array<string> = []
    while (tracks.length < totalItems) {
      if (url !== playlistTracksUrl) {
        result = await this.playlistRepository.getSongsFromPlaylist(url, token)
        nextUrl = result.next
      }
      tracks.push(
        ...result.items.map((item: SpotifyApi.PlaylistTrackObject) => {
          const artists = item.track?.artists
            .map((artist: SpotifyApi.ArtistObjectSimplified) => artist.name)
            .join(', ')
          if (item.track !== null) {
            return `${artists} - ${item.track?.name}`
          }
          return
        })
      )
      url = nextUrl
    }
    return tracks
  }

  async extractPlaylist(playlistUrl: string, token: string) {
    return await this.generateTracksFromPlaylist(playlistUrl, token)
  }
}
