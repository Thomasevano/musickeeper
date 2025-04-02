import { AlbumInfos } from '../../../domain/album.js'

export function SerializeAlbumInfosFromSpotify(album: SpotifyApi.AlbumObjectFull): AlbumInfos {
  return new AlbumInfos({
    id: album.id,
    title: album.name,
    description: album.description,
    tracksUrl: album.tracks.href,
    link: album.external_urls.spotify,
    imageUrl: album.images[0].url,
    artists: album.artists.map((artist) => artist.name),
    releaseDate: album.release_date,
    albumType: album.album_type,
    label: album.label,
    genres: album.genres,
    totalTracks: album.tracks.total,
  })
}
