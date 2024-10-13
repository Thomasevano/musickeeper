import { env } from '$env/dynamic/public';
import type { Writable } from 'svelte/store';

export default async function loadMore(data, $data, isMore: Writable<Boolean>) {

  if ($data.nextUrl === null) {
    isMore.set(false);
    return;
  }
  const res = await fetch(
    $data.nextUrl.replace(`${env.PUBLIC_SPOTIFY_BASE_URL}`, `${import.meta.env.VITE_API_URL}/spotify`)
  );

  if (res.ok) {
    const resJSON = await res.json();
    if (resJSON.previousUrl?.includes('offset=0')) {
      resJSON.playlistsInfos.shift()
    }
    data.set({
      ...resJSON,
      playlistsInfos: [...$data.playlistsInfos, ...resJSON.playlistsInfos]
    });
  }
}