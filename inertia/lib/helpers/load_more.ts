import { InferPageProps } from '@adonisjs/inertia/types'
import PlaylistsController from '../../../src/infrastructure/http/controllers/playlists_controller'
import AlbumsController from '../../../src/infrastructure/http/controllers/albums_controller'

export default async function loadMore(
  $data:
    | InferPageProps<PlaylistsController, 'index'>['spotifyUserPlaylistsInfos']
    | InferPageProps<AlbumsController, 'index'>['spotifyAlbumsInfos'],
  page: string
) {
  const response = await fetch(`/library/${page}?url=${$data.nextUrl}`)

  if (response.status !== 200) {
    throw new Error('Error fetching data')
  }

  return await response.json()
}
