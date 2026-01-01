import { IRecordingList, IRecordingMatch, IReleaseList, IReleaseMatch } from 'musicbrainz-api'
import { MusicItem } from '../../../domain/music_item.js'
import { serializeRecordingAsTrack } from './serialize_recording_as_track.js'
import { serializeReleaseAsAlbum } from './serialize_release_as_albuml.js'

export function serializeMusicBrainzSearchResults(
  searchResults: IReleaseList | IRecordingList
): MusicItem[] {
  if (searchResults.releases) {
    return searchResults.releases.map((release: IReleaseMatch): MusicItem => {
      return serializeReleaseAsAlbum(release)
    })
  }
  return searchResults.recordings.map((recording: IRecordingMatch): MusicItem => {
    return serializeRecordingAsTrack(recording)
  })
}
