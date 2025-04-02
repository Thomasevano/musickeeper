import { AlbumsRepository } from '../../../application/repositories/albums.repository.js'
import { AlbumInfos, PaginatedAlbumInfos } from '../../../domain/album.js'
import { ExpiredAccesTokenException } from '../../../application/exceptions/expired_access_token.exception.js'
import { SerializeAlbumInfosFromSpotify } from '../../serializers/spotify/album.serializer.js'

export class SpotifyAlbumsRepository implements AlbumsRepository {
  async getCurrentUserAlbumsInfos(bearerToken: string): Promise<PaginatedAlbumInfos> {
    let currentUseralbumsInfos: SpotifyApi.UsersSavedAlbumsResponse
    try {
      const result = await fetch(`${process.env.SPOTIFY_BASE_URL}/me/albums?offset=0&limit=50`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`,
        },
      })
      currentUseralbumsInfos = await (result.json() as Promise<SpotifyApi.UsersSavedAlbumsResponse>)
    } catch (error) {
      if (error.status === 401 && error.message === 'Invalid access token') {
        throw new ExpiredAccesTokenException()
      }
      throw new Error()
    }
    const serializedCurrentUseralbumsInfos: AlbumInfos[] = currentUseralbumsInfos.items.map(
      (item: SpotifyApi.SavedAlbumObject) => SerializeAlbumInfosFromSpotify(item.album)
    )

    return new PaginatedAlbumInfos({
      limit: currentUseralbumsInfos.limit,
      offset: currentUseralbumsInfos.offset,
      previousUrl: currentUseralbumsInfos.previous,
      nextUrl: currentUseralbumsInfos.next,
      total: currentUseralbumsInfos.total,
      albumsInfos: serializedCurrentUseralbumsInfos,
    })
  }
}
