import type { ApplicationService } from '@adonisjs/core/types'
import { PlaylistRepository } from './application/repositories/playlist.repository.js'
import { SpotifyPlaylistRepository } from './infrastructure/repositories/playlist.repository.js'

export default class SpotifyProvider {
  constructor(protected app: ApplicationService) { }
  async boot() {
    this.app.container.bind(PlaylistRepository, () => {
      return this.app.container.make(SpotifyPlaylistRepository)
    })
  }
}
