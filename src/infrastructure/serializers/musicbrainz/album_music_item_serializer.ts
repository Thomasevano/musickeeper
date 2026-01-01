import { IReleaseMatch, IArtistCredit } from 'musicbrainz-api'
import { MusicItem, SearchType } from '../../../domain/music_item.js'

export function serializeReleaseAsAlbumMusicItem(release: IReleaseMatch): MusicItem {
  return new MusicItem({
    id: release.id,
    title: release.title,
    releaseDate: release.date,
    artists: release['artist-credit']!.map((artist: IArtistCredit) => artist.name),
    itemType: SearchType.album,
  })
}
