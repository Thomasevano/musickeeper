import { MusicBrainzApi } from 'musicbrainz-api'
import type { ApplicationService } from '@adonisjs/core/types'
import { SearchRepository } from '../../application/repositories/search.repository.js'
import { MusicBrainzRepository } from '../repositories/musicbrainz_search.repository.js'

export default class SpotifyProvider {
  constructor(protected app: ApplicationService) {}
  async boot() {
    this.app.container.bind(SearchRepository, () => {
      return this.app.container.make(MusicBrainzRepository)
    })
  }
}

export const musicbrainzApi = new MusicBrainzApi({
  appName: process.env.APP_NAME,
  appVersion: process.env.APP_VERSION,
  appContactInfo: process.env.APP_CONTACT_EMAIL,
})
