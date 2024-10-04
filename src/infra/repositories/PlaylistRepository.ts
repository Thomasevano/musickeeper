import { type ICurrentUserPlaylistRequestDTO } from "../../domain/dtos/Playlist";

export interface IPlaylistRepository {
  getCurrentUserPlaylists(apiToken: string): Promise<ICurrentUserPlaylistRequestDTO[]>;
}