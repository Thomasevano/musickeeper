import { env } from '$env/dynamic/public';
import type { Writable } from 'svelte/store';

export default async function loadMore(data, $data, isMore: Writable<Boolean>) {

  if ($data.next === null) {
    isMore.set(false);
    return;
  }
  const res = await fetch(
    $data.next.replace(`${env.PUBLIC_SPOTIFY_BASE_URL}`, '/api/spotify')
  );

  if (res.ok) {
    const resJSON = await res.json();
    if (resJSON.previous?.includes('offset=0')) {
      resJSON.items.shift()
    }
    data.set({
      ...resJSON,
      items: [...$data.items, ...resJSON.items]
    });
  }
}