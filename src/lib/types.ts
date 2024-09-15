interface IFeature {
  icon: string
  title: string;
  description: string;
  isAvailable: Boolean;
}

type PlaylistType = SpotifyApi.PlaylistObjectFull | SpotifyApi.PlaylistObjectSimplified;
type ArtistType = SpotifyApi.ArtistObjectFull | SpotifyApi.ArtistObjectSimplified;

export type Dictionary<K extends string | number | symbol = string, V = unknown> = Record<K, V>;