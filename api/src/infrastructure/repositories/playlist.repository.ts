import { ExpiredAccesTokenException } from '../../application/exceptions/expired_access_token.exception.js'
import { PlaylistRepository } from '../../application/repositories/playlist.repository.js'
import { PaginatedPlaylistsInfos, PlaylistInfos } from '../../domain/playlist.js'
import { SerializePlaylistInfosFromSpotify } from '../serializers/spotify/playlist.serializer.js'

export class SpotifyPlaylistRepository implements PlaylistRepository {
  async getCurrentUserPlaylistsInfos(bearerToken: string): Promise<PaginatedPlaylistsInfos> {
    let resultJSON
    try {
      const result = await fetch(`${process.env.SPOTIFY_BASE_URL}/me/playlists`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`,
        },
      })
      resultJSON = await result.json()
      // resultJSON: { error: { status: 401, message: 'Invalid access token' } }
      if (resultJSON.error) {
        throw new Error()
      }
    } catch (error) {
      if (resultJSON.error.status === 401 && resultJSON.error.message === 'Invalid access token') {
        throw new ExpiredAccesTokenException()
      }
      throw new Error()
    }
    const currenteUserplaylistsInfos: SpotifyApi.ListOfCurrentUsersPlaylistsResponse = resultJSON
    const serializedCurrenteUserplaylistsInfos: PlaylistInfos[] =
      currenteUserplaylistsInfos.items.map((playlist: SpotifyApi.PlaylistObjectSimplified) =>
        SerializePlaylistInfosFromSpotify(playlist)
      )

    return new PaginatedPlaylistsInfos({
      limit: currenteUserplaylistsInfos.limit,
      offset: currenteUserplaylistsInfos.offset,
      nextUrl: currenteUserplaylistsInfos.next,
      total: currenteUserplaylistsInfos.total,
      playlistsInfos: serializedCurrenteUserplaylistsInfos,
    })
  }
}
