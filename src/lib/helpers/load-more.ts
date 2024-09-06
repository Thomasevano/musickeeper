import { env } from '$env/dynamic/public';
import { spotifyUserPlaylists } from '$lib/store';

export default async function loadMore($spotifyUserPlaylists: SpotifyApi.ListOfCurrentUsersPlaylistsResponse, isMorePlaylist: Boolean) {
  spotifyUserPlaylists.set($spotifyUserPlaylists)

  if ($spotifyUserPlaylists.next === null) {
    isMorePlaylist = false;
    return;
  }
  const res = await fetch(
    $spotifyUserPlaylists.next.replace(`${env.PUBLIC_SPOTIFY_BASE_URL}`, '/api/spotify')
  );

  if (res.ok) {
    const resJSON = await res.json();
    if (resJSON.previous?.includes('offset=0')) {
      resJSON.items.shift()
    }
    spotifyUserPlaylists.set({
      ...resJSON,
      items: [...$spotifyUserPlaylists.items, ...resJSON.items]
    });
  }
}