import { type IMusicServiceProvider } from "../../app/providers/MusicServiceProvider";
import { PlaylistEntity } from "../../domain/entities/Playlist";

export class SpotifyProvider implements IMusicServiceProvider {

  async getCurrentUserPlaylists(apiToken: string): Promise<PlaylistEntity[]> {
    const result = await fetch(`${import.meta.env.VITE_BASE_URL}/api/spotify/me/playlists`, {
      headers: { Authorization: `Bearer ${apiToken}` }
    });
    const playlistsJSON: SpotifyApi.ListOfCurrentUsersPlaylistsResponse = await result.json();

    const playlists = playlistsJSON.items.map((playlist: SpotifyApi.PlaylistObjectSimplified) => (
      new PlaylistEntity({
        id: playlist.id,
        title: playlist.name,
        description: playlist.description || '',
        songs: [],
        link: playlist.external_urls.spotify,
        imageUrl: playlist.images[0].url,
        owner: playlist.owner.display_name ?? playlist.owner.id
      })
    ));
    return playlists;
  }
}
