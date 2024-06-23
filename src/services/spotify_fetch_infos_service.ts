import axios from "axios";
import { fetchRefresh } from "$helpers";
import { PUBLIC_SPOTIFY_BASE_URL } from "$env/static/public";

async function fetchProfile(token: string): Promise<any> {
  const result = await axios.get(`${PUBLIC_SPOTIFY_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return await result.data;
}

async function fetchUserSavedAlbums(token: string): Promise<any> {
  const result = await axios.get(`${PUBLIC_SPOTIFY_BASE_URL}/me/albums`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return await result.data;
}

const fetchUserPlaylists = async (fetch: (input: URL | RequestInfo, init?: RequestInit | undefined) => Promise<Response>): Promise<any> => {
  const result = await fetchRefresh(fetch, `/api/spotify/me/playlists`);

  return await result;
}

const fetchSongsFromPlaylist = async (fetch: (input: URL | RequestInfo, init?: RequestInit | undefined) => Promise<Response>, url: string): Promise<any> => {
  const result = await fetchRefresh(fetch, `${url.replace(`${PUBLIC_SPOTIFY_BASE_URL}`, '/api/spotify')}`);

  return await result;
}

export { fetchProfile, fetchUserSavedAlbums, fetchUserPlaylists, fetchSongsFromPlaylist }