import {
  type IRecordingList,
  type IRecordingMatch,
  type IReleaseList,
  type IReleaseMatch,
} from 'musicbrainz-api'
import { type MusicItem } from '../../../domain/music_item.js'
import { coverArtUrlForRelease } from './cover_art_url.js'
import { serializeRecordingAsTrackMusicItem } from './track_music_item_serializer.js'
import { serializeReleaseAsAlbumMusicItem } from './album_music_item_serializer.js'

// Priority order for release group types when picking cover art
const RELEASE_TYPE_PRIORITY: Record<string, number> = {
  Album: 0,
  Single: 1,
  EP: 2,
  Compilation: 3,
  Broadcast: 4,
  Other: 5,
}

function releaseType(release: IReleaseMatch): string {
  const group = release['release-group']
  return group?.['secondary-types']?.includes('Compilation')
    ? 'Compilation'
    : (group?.['primary-type'] ?? 'Other')
}

/**
 * Order a recording's releases by how likely they are to carry usable artwork.
 * Prefers Album > Single > EP > Compilation > others.
 */
function sortReleasesForCoverArt(releases: IReleaseMatch[]): IReleaseMatch[] {
  return [...releases].sort((a, b) => {
    const typeA = releaseType(a)
    const typeB = releaseType(b)
    const priorityA = RELEASE_TYPE_PRIORITY[typeA] ?? 99
    const priorityB = RELEASE_TYPE_PRIORITY[typeB] ?? 99
    return priorityA - priorityB
  })
}

export function serializeMusicBrainzSearchResults(
  searchResults: IReleaseList | IRecordingList
): MusicItem[] {
  // @ts-expect-error musicbrainz-api doesn't allow union types
  if (searchResults.releases) {
    // @ts-expect-error musicbrainz-api doesn't allow union types
    return searchResults.releases.map((release: IReleaseMatch) =>
      serializeReleaseAsAlbumMusicItem(release, coverArtUrlForRelease(release))
    )
  }

  // @ts-expect-error musicbrainz-api doesn't allow union types
  return searchResults.recordings.map((recording: IRecordingMatch) => {
    if (recording.releases && recording.releases.length > 0) {
      const sorted = sortReleasesForCoverArt(recording.releases as IReleaseMatch[])
      return serializeRecordingAsTrackMusicItem(recording, sorted[0])
    }
    return serializeRecordingAsTrackMusicItem(recording)
  })
}
