import type { Writable } from 'svelte/store';
import type { PaginatedPlaylistsInfos, providerTokens } from '../../types';
import { api } from '$lib/api';

export default async function loadMore(tokens: providerTokens, data: Writable<PaginatedPlaylistsInfos>, $data: PaginatedPlaylistsInfos) {
  const response = await api().getUserPlaylistsInfos(tokens, $data.nextUrl)

  if (response.previousUrl.includes('offset=0')) {
    response.playlistsInfos.shift()
  }
  data.set({
    ...response,
    playlistsInfos: [...$data.playlistsInfos, ...response.playlistsInfos]
  });
}
