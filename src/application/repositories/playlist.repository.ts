import { PaginatedPlaylistsInfos } from '../../domain/playlist.js'
import { Track } from '../../domain/track.js'

export abstract class PlaylistRepository {
  abstract getCurrentUserPlaylistsInfos(token: string): Promise<PaginatedPlaylistsInfos>
  abstract getUserPlaylistsInfos(token: string, url: string): Promise<PaginatedPlaylistsInfos>
  abstract getSongsFromPlaylist(playlistUrl: string, token: string): Promise<Track[]>
}
