import { IRecordingList, IRecordingMatch, IReleaseList, IReleaseMatch } from 'musicbrainz-api'
import { MusicItem } from '../../../domain/music_item.js'
import { serializeRecordingAsTrackMusicItem } from './track_music_item_serializer.js'
import { serializeReleaseAsAlbumMusicItem } from './album_music_item_serializer.js'
import { coverArtArchiveApiClient } from '../../../infrastructure/providers/musicbrainz_provider.js'

export async function serializeMusicBrainzSearchResults(
  searchResults: IReleaseList | IRecordingList
): Promise<MusicItem[]> {
  // @ts-expect-error musicbrainz-api doesn't allow union types
  if (searchResults.releases) {
    // @ts-expect-error musicbrainz-api doesn't allow union types
    const promises = searchResults.releases.map(async (release: IReleaseMatch) => {
      const coverArt = await coverArtArchiveApiClient.getReleaseCover(release.id, 'front')
      // TODO: maybe this could be refactored as one serializer for music items
      // TODO: write a test for this file
      if (coverArt.url) {
        return serializeReleaseAsAlbumMusicItem(release, coverArt.url)
      }
      return serializeReleaseAsAlbumMusicItem(release)
    })
    return Promise.all(promises)
  }
  // @ts-expect-error musicbrainz-api doesn't allow union types
  const promises = searchResults.recordings.map(async (recording: IRecordingMatch) => {
    if (recording.releases) {
      const coverArt = await coverArtArchiveApiClient.getReleaseCover(
        recording.releases[0].id,
        'front'
      )
      if (coverArt.url) {
        return serializeRecordingAsTrackMusicItem(recording, coverArt.url)
      }
    }
    return serializeRecordingAsTrackMusicItem(recording)
  })
  return Promise.all(promises)
}
