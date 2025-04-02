import type { ApplicationService } from '@adonisjs/core/types'
import { PlaylistRepository } from './application/repositories/playlist.repository.js'
import { SpotifyPlaylistRepository } from './infrastructure/repositories/spotify/spotify_playlist.repository.js'
import { AlbumsRepository } from './application/repositories/albums.repository.js'
import { SpotifyAlbumsRepository } from './infrastructure/repositories/spotify/spotify_albums.repository.js'

export default class SpotifyProvider {
  constructor(protected app: ApplicationService) { }
  async boot() {
    this.app.container.bind(PlaylistRepository, () => {
      return this.app.container.make(SpotifyPlaylistRepository)
    })
    this.app.container.bind(AlbumsRepository, () => {
      return this.app.container.make(SpotifyAlbumsRepository)
    })
  }
}
