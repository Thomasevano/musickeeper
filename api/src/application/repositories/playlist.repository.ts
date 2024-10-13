import { PaginatedPlaylistsInfos } from '../../domain/playlist.js'

export abstract class PlaylistRepository {
  abstract getCurrentUserPlaylistsInfos(token: string): Promise<PaginatedPlaylistsInfos>
  abstract getUserPlaylistsInfos(
    token: string,
    userId: string,
    params: string
  ): Promise<PaginatedPlaylistsInfos>
}
