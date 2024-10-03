import { type IMusicServiceProvider } from "../providers/MusicServiceProvider";
import { type IPlaylistRepository } from "../repositories/PlaylistRepository";
import { type Playlist } from "../../domain/dtos/Playlist";

export class PlaylistUseCase {
  constructor(
    private readonly playlistRepository: IPlaylistRepository,
    private readonly musicServiceProvider: IMusicServiceProvider
  ) {
    const provider = localStorage.getItem("provider");
    // this.playlistRepository
  }

  async getUserPlaylists(): Promise<Playlist[]> {
    return this.playlistRepository.findByCurrentUser();
  }
}
