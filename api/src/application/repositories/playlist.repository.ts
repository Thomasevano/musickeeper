import { Playlist } from '../../domain/playlist.js'

export abstract class PlaylistRepository {
  abstract getCurrentUserPlaylists(): Promise<Playlist[] | null>
}
