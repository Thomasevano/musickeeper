import { Playlist } from '../../../domain/playlist.js'

export function SerializePlaylistFromSpotify(
  playlist: SpotifyApi.PlaylistObjectSimplified
): Playlist {
  return new Playlist({
    id: playlist.id,
    title: playlist.name,
    description: playlist.description,
    tracks: [],
    link: playlist.external_urls.spotify,
    imageUrl: playlist.images[0].url,
    owner: playlist.owner.display_name ?? playlist.owner.id,
  })
}
