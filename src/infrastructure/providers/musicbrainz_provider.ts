import type { ApplicationService } from '@adonisjs/core/types'
import { CoverArtArchiveApi, MusicBrainzApi } from 'musicbrainz-api'
import { SearchRepository } from '../../application/repositories/search.repository.js'
import { MusicBrainzRepository } from '../repositories/musicbrainz_search.repository.js'
import { readFileSync } from 'node:fs'

export default class MusicBrainzProvider {
  constructor(protected app: ApplicationService) {}
  async boot() {
    this.app.container.bind(SearchRepository, () => {
      return this.app.container.make(MusicBrainzRepository)
    })
  }
}
const packageJson = JSON.parse(
  readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')
)

export const musicbrainzApi = new MusicBrainzApi({
  appName: packageJson.name,
  appVersion: packageJson.version,
  appContactInfo: process.env.MB_APP_CONTACT_EMAIL,
})

export const coverArtArchiveApiClient = new CoverArtArchiveApi()
