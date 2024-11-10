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
      if (resultJSON.error) {
        throw new Error()
      }
    } catch (error) {
      if (resultJSON.error.status === 401 && resultJSON.error.message === 'Invalid access token') {
        throw new ExpiredAccesTokenException()
      }
      throw new Error()
    }
    const currentUserplaylistsInfos: SpotifyApi.ListOfCurrentUsersPlaylistsResponse = resultJSON
    const serializedCurrentUserplaylistsInfos: PlaylistInfos[] =
      currentUserplaylistsInfos.items.map((playlist: SpotifyApi.PlaylistObjectSimplified) =>
        SerializePlaylistInfosFromSpotify(playlist)
      )

    return new PaginatedPlaylistsInfos({
      limit: currentUserplaylistsInfos.limit,
      offset: currentUserplaylistsInfos.offset,
      previousUrl: currentUserplaylistsInfos.previous,
      nextUrl: currentUserplaylistsInfos.next,
      total: currentUserplaylistsInfos.total,
      playlistsInfos: serializedCurrentUserplaylistsInfos,
    })
  }

  async getUserPlaylistsInfos(bearerToken: string, url: string): Promise<PaginatedPlaylistsInfos> {
    const userplaylistsInfos: SpotifyApi.ListOfCurrentUsersPlaylistsResponse = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
    }).then((response) => response.json())
    const serializedUserplaylistsInfos: PlaylistInfos[] = userplaylistsInfos.items.map(
      (playlist: SpotifyApi.PlaylistObjectSimplified) => SerializePlaylistInfosFromSpotify(playlist)
    )

    return new PaginatedPlaylistsInfos({
      limit: userplaylistsInfos.limit,
      offset: userplaylistsInfos.offset,
      previousUrl: userplaylistsInfos.previous,
      nextUrl: userplaylistsInfos.next,
      total: userplaylistsInfos.total,
      playlistsInfos: serializedUserplaylistsInfos,
    })
  }

  async getSongsFromPlaylist(playlistUrl: string, token: string): Promise<Array<string>> {
    let url = playlistUrl
    let result = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
    return await result.json()
  }
}
