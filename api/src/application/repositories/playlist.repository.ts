
import { PaginatedPlaylistsInfos, Playlist } from '../../domain/playlist.js'

export abstract class PlaylistRepository {
  abstract getCurrentUserPlaylistsInfos(token: string): Promise<PaginatedPlaylistsInfos>
}
