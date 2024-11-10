import type { Writable } from 'svelte/store'
import { PaginatedPlaylistsInfos } from '../../../src/domain/playlist'

export default async function loadMore(
  data: Writable<PaginatedPlaylistsInfos>,
  $data: PaginatedPlaylistsInfos
) {
  const response = await fetch(`/library/playlists?url=${$data.nextUrl}`)

  if (response.status !== 200) {
    throw new Error('Error fetching playlists')
  }

  const json = await response.json()
  data.set({
    ...json.nextSpotifyUserPlaylistsInfos,
    playlistsInfos: [...$data.playlistsInfos, ...json.nextSpotifyUserPlaylistsInfos.playlistsInfos],
  })
}
