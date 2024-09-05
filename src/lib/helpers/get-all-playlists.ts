import { PUBLIC_SPOTIFY_BASE_URL } from '$env/static/public';
import type { Cookies } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { fetchUserPlaylists } from '../../services/spotify_fetch_infos_service';

export async function getAllPlaylists(fetch: (input: URL | RequestInfo, init?: RequestInit | undefined) => Promise<Response>, cookies: Cookies) {
  const spotifyAccessToken = cookies.get('spotify_access_token');
  let userPlaylists = await fetchUserPlaylists(spotifyAccessToken!)
  if (!userPlaylists.ok) {
    throw error(userPlaylists.status, 'Failed to load playlists!');
  }
  userPlaylists = await userPlaylists.json();

  while (userPlaylists.items.length < userPlaylists.total && userPlaylists.next) {
    const res = await fetch(
      userPlaylists.next.replace(`${PUBLIC_SPOTIFY_BASE_URL}`, '/api/spotify')
    );
    if (res.ok) {
      const resJSON = await res.json();
      if (resJSON.previous?.includes('offset=0')) {
        resJSON.items.shift()
      }
      userPlaylists = {
        ...resJSON,
        items: [...userPlaylists.items, ...resJSON.items]
      };
    }
  }
  return userPlaylists.items
}