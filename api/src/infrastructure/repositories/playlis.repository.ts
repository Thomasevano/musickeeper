import { PlaylistRepository } from '../../application/repositories/playlist.repository.js'
import { Playlist } from '../../domain/playlist.js'
import { SerializePlaylistFromSpotify } from '../serializers/spotify/playlist.serializer.js'

export class SpotifyPlaylistRepository implements PlaylistRepository {
  async getCurrentUserPlaylistsInfos(bearerToken: string): Promise<Playlist[] | null> {
    let result
    try {
      result = await fetch(`${process.env.SPOTIFY_BASE_URL}/me/playlists`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`,
        },
      })
    } catch (error) {
      throw new Error(error)
    }
    let playlists: SpotifyApi.ListOfCurrentUsersPlaylistsResponse = await result.json()
    playlists = playlists.items.map((playlist: SpotifyApi.PlaylistObjectSimplified) =>
      SerializePlaylistFromSpotify(playlist)
    )
    return playlists
  }
}
