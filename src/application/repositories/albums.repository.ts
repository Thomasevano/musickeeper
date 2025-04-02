import { PaginatedAlbumInfos } from '../../domain/album.js'

export abstract class AlbumsRepository {
  abstract getCurrentUserAlbumsInfos(token: string): Promise<PaginatedAlbumInfos>
}
