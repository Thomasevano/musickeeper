import { env } from '$env/dynamic/public';
import type { Writable } from 'svelte/store';
import { fetchUserNextPlaylists } from '../../services/spotify_fetch_infos_service';
import type { spotifyTokens } from '../../types';

export default async function loadMore(tokens: spotifyTokens, data, $data, isMore: Writable<Boolean>) {
  if ($data.nextUrl === null) {
    isMore.set(false);
    return;
  }

  const res = await fetchUserNextPlaylists(tokens, $data.nextUrl)
  console.log({ res })

  if (res.ok) {
    const resJSON = await res.json();
    console.log({ resJSON })
    if (!resJSON.previousUrl) {
      resJSON.playlistsInfos.shift()
    }
    data.set({
      ...resJSON,
      playlistsInfos: [...$data.playlistsInfos, ...resJSON.playlistsInfos]
    });
  }
}