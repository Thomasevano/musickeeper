import { IRecordingMatch, IArtistCredit } from 'musicbrainz-api'
import { MusicItem, SearchType } from '../../../domain/music_item.js'

export function serializeRecordingAsTrackMusicItem(
  recording: IRecordingMatch,
  coverArtUrl: string = 'https://placehold.co/32x32'
): MusicItem {
  return new MusicItem({
    id: recording.id,
    title: recording.title,
    releaseDate: recording['first-release-date'],
    length: recording.length,
    artists: recording['artist-credit']!.map(
      (artistCredit: IArtistCredit) => artistCredit.artist.name
    ),
    albumName: recording.releases && recording.releases[0].title,
    itemType: SearchType.track,
    coverArt: coverArtUrl,
  })
}
