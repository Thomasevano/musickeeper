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
      const coverArt = await coverArtArchiveApiClient.getReleaseCovers(release.id)
      // TODO: maybe this could be refactored as one serializer for music items
      // TODO: write a test for this file
      if (coverArt.images) {
        if (coverArt.images.length > 0) {
          return serializeReleaseAsAlbumMusicItem(release, coverArt.images[0].thumbnails.small)
        }
        return serializeReleaseAsAlbumMusicItem(release)
      }
      return serializeReleaseAsAlbumMusicItem(release)
    })
    return Promise.all(promises)
  }
  // @ts-expect-error musicbrainz-api doesn't allow union types
  const promises = searchResults.recordings.map(async (recording: IRecordingMatch) => {
    if (recording.releases) {
      const coversArt = await coverArtArchiveApiClient.getReleaseCovers(recording.releases[0].id)

      if (coversArt.images) {
        if (coversArt.images.length > 0) {
          return serializeRecordingAsTrackMusicItem(recording, coversArt.images[0].thumbnails.small)
        }
        return serializeRecordingAsTrackMusicItem(recording)
      }
      return serializeRecordingAsTrackMusicItem(recording)
    }
    return serializeRecordingAsTrackMusicItem(recording)
  })
  return Promise.all(promises)
}
