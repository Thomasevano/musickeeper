import { IRecordingList, IRecordingMatch, IReleaseList, IReleaseMatch } from 'musicbrainz-api'
import { MusicItem } from '../../../domain/music_item.js'
import { serializeRecordingAsTrackMusicItem } from './track_music_item_serializer.js'
import { serializeReleaseAsAlbumMusicItem } from './album_music_item_serializer.js'
export function serializeMusicBrainzSearchResults(
  searchResults: IReleaseList | IRecordingList
): MusicItem[] {
  // @ts-expect-error musicbrainz-api doesn't allow union types
  if (searchResults.releases) {
    // @ts-expect-error musicbrainz-api doesn't allow union types
    return searchResults.releases.map((release: IReleaseMatch): MusicItem => {
      return serializeReleaseAsAlbumMusicItem(release)
    })
  }
  // @ts-expect-error musicbrainz-api doesn't allow union types
  return searchResults.recordings.map((recording: IRecordingMatch): MusicItem => {
    return serializeRecordingAsTrackMusicItem(recording)
  })
}
