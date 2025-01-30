import { PaginatedTrackListInfos } from '../../../domain/track_list.js'
import { serializeTrackInfosFromSpotify } from './track.serializer.js'

export function serializePaginatedTracksListInfosFromSpotify(
  trackList: SpotifyApi.PagingObject<SpotifyApi.PlaylistTrackObject>
): PaginatedTrackListInfos {
  if (trackList.items !== null) {
    return new PaginatedTrackListInfos({
      limit: trackList.limit,
      offset: trackList.offset,
      previousUrl: trackList.previous,
      nextUrl: trackList.next,
      total: trackList.total,
      tracks: trackList.items.map((item: SpotifyApi.PlaylistTrackObject) =>
        serializeTrackInfosFromSpotify(item.track!)
      ),
    })
  }
  return new PaginatedTrackListInfos({
    limit: trackList.limit,
    offset: trackList.offset,
    previousUrl: trackList.previous,
    nextUrl: trackList.next,
    total: trackList.total,
    tracks: null,
  })
}
