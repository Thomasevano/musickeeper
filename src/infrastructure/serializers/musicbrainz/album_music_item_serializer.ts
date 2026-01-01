import { IReleaseMatch, IArtistCredit } from 'musicbrainz-api'
import { MusicItem, SearchType } from '../../../domain/music_item.js'

export function serializeReleaseAsAlbumMusicItem(release: IReleaseMatch): MusicItem {
  return new MusicItem({
    id: release.id,
    title: release.title,
    releaseDate: release.date,
    artists: release['artist-credit']!.map(
      (artistCredit: IArtistCredit) => artistCredit.artist.name
    ),
    albumName: release.title,
    itemType: SearchType.album,
  })
}
