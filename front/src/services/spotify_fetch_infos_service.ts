import axios from "axios";
import { env } from "$env/dynamic/public";

async function fetchProfile(token: string): Promise<any> {
  const result = await axios.get(`${env.PUBLIC_SPOTIFY_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return await result.data;
}

async function fetchUserSavedAlbums(token: string): Promise<any> {
  const result = await axios.get(`${env.PUBLIC_SPOTIFY_BASE_URL}/me/albums`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return await result.data;
}

async function fetchUserPlaylists(token: string): Promise<any> {
  const result = await fetch(`${import.meta.env.VITE_BASE_URL}/api/spotify/me/playlists`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return await result;
}

const fetchSongsFromPlaylist = async (fetch: (input: URL | RequestInfo, init?: RequestInit | undefined) => Promise<Response>, url: string): Promise<any> => {
  const result = await fetch(`${url.replace(`${env.PUBLIC_SPOTIFY_BASE_URL}`, '/api/spotify')}`);

  return await result;
}

export { fetchProfile, fetchUserSavedAlbums, fetchUserPlaylists, fetchSongsFromPlaylist }