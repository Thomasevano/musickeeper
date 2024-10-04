import { type PlaylistEntity } from "../../domain/entities/Playlist";

export interface IMusicServiceProvider {
  getCurrentUserPlaylists(apiToken: string): Promise<PlaylistEntity[]>;
}

const musicProviderMap: Map<string, IMusicServiceProvider> = new Map<string, IMusicServiceProvider>([
  ['spotify', new SpotifyProvider()]
])

export const getMusicProvider = (provider: string): IMusicServiceProvider => {
  return musicProviderMap.get(provider)!
}