import { PlaylistInfos } from '../../../domain/playlist.js'

export function SerializePlaylistInfosFromSpotify(
  playlist: SpotifyApi.PlaylistObjectSimplified
): PlaylistInfos {
  return new PlaylistInfos({
    id: playlist.id,
    title: playlist.name,
    description: playlist.description,
    tracksUrl: playlist.tracks.href,
    link: playlist.external_urls.spotify,
    imageUrl: playlist.images[0].url,
    owner: playlist.owner.display_name ?? playlist.owner.id,
  })
}
