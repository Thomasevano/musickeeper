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
    const currentUserplaylistsInfos: SpotifyApi.ListOfCurrentUsersPlaylistsResponse = resultJSON
    const serializedCurrentUserplaylistsInfos: PlaylistInfos[] =
      currentUserplaylistsInfos.items.map((playlist: SpotifyApi.PlaylistObjectSimplified) =>
        SerializePlaylistInfosFromSpotify(playlist)
      )

    const previousUrl = currentUserplaylistsInfos.previous
      ?.toString()
      .replace(`${process.env.SPOTIFY_BASE_URL}`, `${process.env.BASE_URL}/api/spotify`)

    const nextUrl = currentUserplaylistsInfos.next
      ?.toString()
      .replace(`${process.env.SPOTIFY_BASE_URL}`, `${process.env.BASE_URL}/api/spotify`)

    return new PaginatedPlaylistsInfos({
      limit: currentUserplaylistsInfos.limit,
      offset: currentUserplaylistsInfos.offset,
      previousUrl,
      nextUrl,
      total: currentUserplaylistsInfos.total,
      playlistsInfos: serializedCurrentUserplaylistsInfos,
    })
  }

  async getUserPlaylistsInfos(
    bearerToken: string,
    userId: string,
    offset: number | null,
    limit: number | null
  ): Promise<PaginatedPlaylistsInfos> {
    const url = `${process.env.SPOTIFY_BASE_URL}/users/${userId}/playlists?offset=${offset}&limit=${limit}&locale=*`
    const userplaylistsInfos: SpotifyApi.ListOfCurrentUsersPlaylistsResponse = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
    }).then((response) => response.json())
    const serializedUserplaylistsInfos: PlaylistInfos[] = userplaylistsInfos.items.map(
      (playlist: SpotifyApi.PlaylistObjectSimplified) => SerializePlaylistInfosFromSpotify(playlist)
    )

    const previousUrl = userplaylistsInfos.previous?.replace(
      `${process.env.SPOTIFY_BASE_URL}`,
      `${process.env.BASE_URL}/api/spotify`
    )
    const nextUrl = userplaylistsInfos.next?.replace(
      `${process.env.SPOTIFY_BASE_URL}`,
      `${process.env.BASE_URL}/api/spotify`
    )
    return new PaginatedPlaylistsInfos({
      limit: userplaylistsInfos.limit,
      offset: userplaylistsInfos.offset,
      previousUrl,
      nextUrl,
      total: userplaylistsInfos.total,
      playlistsInfos: serializedUserplaylistsInfos,
    })
  }
}
