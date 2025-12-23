import { MusicBrainzApi } from 'musicbrainz-api'

export const musicbrainzApi = new MusicBrainzApi({
  appName: process.env.APP_NAME,
  appVersion: process.env.APP_VERSION,
  appContactInfo: process.env.APP_CONTACT_EMAIL,
})
