import { type IMusicServiceProvider } from "../../app/providers/MusicServiceProvider";
import { type Playlist } from "../../domain/dtos/Playlist";

export class SpotifyProvider implements IMusicServiceProvider {
  async getCurrentUserPlaylists(apiToken: string): Promise<Playlist[]> {
    const result = await fetch(`${import.meta.env.VITE_BASE_URL}/api/spotify/me/playlists`, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });
    return result;
  }
}