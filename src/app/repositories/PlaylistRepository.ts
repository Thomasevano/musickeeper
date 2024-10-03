import { type Playlist } from "../../domain/dtos/Playlist";

export interface IPlaylistRepository {
  findByCurrentUser(): Promise<Playlist[]>;
}