import { PaginatedPlaylistsInfos } from '../../domain/playlist.js'

export abstract class PlaylistRepository {
  abstract getCurrentUserPlaylistsInfos(token: string): Promise<PaginatedPlaylistsInfos>
  abstract getUserPlaylistsInfos(token: string, url: string): Promise<PaginatedPlaylistsInfos>
  abstract getSongsFromPlaylist(playlistUrl: string, token: string): Promise<Array<string>>
}
