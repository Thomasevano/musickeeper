import { ExpiredAccesTokenException } from '../../../application/exceptions/expired_access_token.exception.js'
import { PlaylistRepository } from '../../../application/repositories/playlist.repository.js'
import { PaginatedPlaylistsInfos, PlaylistInfos } from '../../../domain/playlist.js'
import { Track } from '../../../domain/track.js'
import { SerializePlaylistInfosFromSpotify } from '../../serializers/spotify/playlist.serializer.js'
import { serializeTrackInfosFromSpotify } from '../../serializers/spotify/track.serializer.js'

export class SpotifyPlaylistRepository implements PlaylistRepository {
  async getCurrentUserPlaylistsInfos(bearerToken: string): Promise<PaginatedPlaylistsInfos> {
    let currentUserplaylistsInfos: SpotifyApi.ListOfCurrentUsersPlaylistsResponse
    try {
      const result = await fetch(`${process.env.SPOTIFY_BASE_URL}/me/playlists`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`,
        },
      })
      currentUserplaylistsInfos = await (result.json() as Promise<SpotifyApi.ListOfCurrentUsersPlaylistsResponse>)
    } catch (error) {
      if (error.status === 401 && error.message === 'Invalid access token') {
        throw new ExpiredAccesTokenException()
      }
      throw new Error()
    }
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
    const userplaylistsInfos = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
    }).then((response) => (response.json() as Promise<SpotifyApi.ListOfCurrentUsersPlaylistsResponse>))
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

  async getSongsFromPlaylist(playlistTracksUrl: string, token: string): Promise<Track[]> {
    let paginatedSpotifyPlaylistTracks =
      await fetch(playlistTracksUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }).then((response) => (response.json() as Promise<SpotifyApi.PagingObject<SpotifyApi.PlaylistTrackObject>>))

    let nextUrl = paginatedSpotifyPlaylistTracks.next
    const totalItems = paginatedSpotifyPlaylistTracks.total
    const tracks: Track[] = []
    let url = playlistTracksUrl
    while (tracks.length < totalItems - 1) {
      if (url !== playlistTracksUrl) {
        paginatedSpotifyPlaylistTracks = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }).then((response) => (response.json() as Promise<SpotifyApi.PagingObject<SpotifyApi.PlaylistTrackObject>>))
        nextUrl = paginatedSpotifyPlaylistTracks.next
      }
      tracks.push(
        ...paginatedSpotifyPlaylistTracks.items.map((item: SpotifyApi.PlaylistTrackObject) =>
          serializeTrackInfosFromSpotify(item.track!)
        )
      )
      url = nextUrl!
    }

    return tracks
  }
}
