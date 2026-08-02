import { IRecordingMatch, IReleaseMatch, IArtistCredit } from 'musicbrainz-api'
import { MusicItem, SearchType } from '../../../domain/music_item.js'
import { coverArtUrlForRelease } from './cover_art_url.js'

export function serializeRecordingAsTrackMusicItem(
  recording: IRecordingMatch,
  bestRelease?: IReleaseMatch
): MusicItem {
  const release = bestRelease || (recording.releases?.[0] as IReleaseMatch | undefined)
  return new MusicItem({
    id: recording.id,
    title: recording.title,
    releaseDate: recording['first-release-date'],
    length: recording.length,
    artists: recording['artist-credit']!.map(
      (artistCredit: IArtistCredit) => artistCredit.artist.name
    ),
    albumName: release?.title,
    itemType: SearchType.track,
    coverArt: release ? coverArtUrlForRelease(release) : undefined,
  })
}
