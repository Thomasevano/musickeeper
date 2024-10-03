import { type Playlist } from "../../domain/dtos/Playlist";

export interface IMusicServiceProvider {
  getCurrentUserPlaylists(apiToken: string): Promise<Playlist[]>;
}
