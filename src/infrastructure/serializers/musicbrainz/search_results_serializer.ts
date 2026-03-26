import { IRecordingList, IRecordingMatch, IReleaseList, IReleaseMatch } from 'musicbrainz-api'
import { MusicItem } from '../../../domain/music_item.js'
import { serializeRecordingAsTrackMusicItem } from './track_music_item_serializer.js'
import { serializeReleaseAsAlbumMusicItem } from './album_music_item_serializer.js'
import { coverArtArchiveApiClient } from '../../../infrastructure/providers/musicbrainz_provider.js'

// Priority order for release group types when picking cover art
const RELEASE_TYPE_PRIORITY: Record<string, number> = {
  Album: 0,
  Single: 1,
  EP: 2,
  Compilation: 3,
  Broadcast: 4,
  Other: 5,
}

/**
 * Pick the best release for cover art and album name.
 * Prefers Album > Single > EP > Compilation > others.
 */
function pickBestRelease(releases: IReleaseMatch[]): IReleaseMatch {
  return [...releases].sort((a, b) => {
    const typeA = a['release-group']?.['primary-type'] || 'Other'
    const typeB = b['release-group']?.['primary-type'] || 'Other'
    const priorityA = RELEASE_TYPE_PRIORITY[typeA] ?? 99
    const priorityB = RELEASE_TYPE_PRIORITY[typeB] ?? 99
    return priorityA - priorityB
  })[0]
}

async function fetchCoverArt(releaseId: string): Promise<string | undefined> {
  try {
    const coverArt = await coverArtArchiveApiClient.getReleaseCovers(releaseId)
    if (coverArt.images && coverArt.images.length > 0) {
      return coverArt.images[0].thumbnails.small
    }
  } catch {
    // CoverArtArchive may 404 for some releases
  }
  return undefined
}

export async function serializeMusicBrainzSearchResults(
  searchResults: IReleaseList | IRecordingList
): Promise<MusicItem[]> {
  // @ts-expect-error musicbrainz-api doesn't allow union types
  if (searchResults.releases) {
    // @ts-expect-error musicbrainz-api doesn't allow union types
    const promises = searchResults.releases.map(async (release: IReleaseMatch) => {
      const coverArtUrl = await fetchCoverArt(release.id)
      return serializeReleaseAsAlbumMusicItem(release, coverArtUrl)
    })
    return Promise.all(promises)
  }

  // @ts-expect-error musicbrainz-api doesn't allow union types
  const promises = searchResults.recordings.map(async (recording: IRecordingMatch) => {
    if (recording.releases && recording.releases.length > 0) {
      const bestRelease = pickBestRelease(recording.releases as IReleaseMatch[])
      const coverArtUrl = await fetchCoverArt(bestRelease.id)
      return serializeRecordingAsTrackMusicItem(recording, coverArtUrl, bestRelease)
    }
    return serializeRecordingAsTrackMusicItem(recording)
  })
  return Promise.all(promises)
}
