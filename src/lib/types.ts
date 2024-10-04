interface IFeature {
  icon: string
  title: string;
  description: string;
  isAvailable: Boolean;
}

type SpotifyPlaylistType = SpotifyApi.PlaylistObjectFull | SpotifyApi.PlaylistObjectSimplified;
type ArtistType = SpotifyApi.ArtistObjectFull | SpotifyApi.ArtistObjectSimplified;
