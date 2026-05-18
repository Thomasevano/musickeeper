import { CoverArtArchiveApi, MusicBrainzApi } from 'musicbrainz-api'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(
  readFileSync(new URL('../../../../package.json', import.meta.url), 'utf8')
)

export const musicbrainzApi = new MusicBrainzApi({
  appName: packageJson.name,
  appVersion: packageJson.version,
  appContactInfo: process.env.MB_APP_CONTACT_EMAIL,
})

export const coverArtArchiveApiClient = new CoverArtArchiveApi()
