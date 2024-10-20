import axios from "axios";
import { env } from "$env/dynamic/public";
import type { spotifyTokens } from "../types";

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

async function fetchUserPlaylists(tokens: spotifyTokens): Promise<any> {
  try {
    const result = await fetch(`${import.meta.env.VITE_API_URL}/spotify/me/playlists`, {
      headers: {
        Cookie: `spotify_access_token=${tokens.accessToken}; spotify_refresh_token=${tokens.refreshToken}; spotify_access_token_expires_at=${tokens.expiresAt}`
      }
    });
    return await result;
  } catch (error) {
    console.log({ error })
  }
}

async function fetchUserNextPlaylists(tokens: spotifyTokens, url: string): Promise<any> {
  try {
    const result = await fetch(url, {
      headers: {
        Cookie: `spotify_access_token=${tokens.accessToken}`
      }
    });
    return await result;
  } catch (error) {
    console.log({ error })
  }
}

const fetchSongsFromPlaylist = async (fetch: (input: URL | RequestInfo, init?: RequestInit | undefined) => Promise<Response>, url: string): Promise<any> => {
  const result = await fetch(`${url.replace(`${env.PUBLIC_SPOTIFY_BASE_URL}`, '/api/spotify')}`);

  return await result;
}

export { fetchProfile, fetchUserSavedAlbums, fetchUserPlaylists, fetchSongsFromPlaylist, fetchUserNextPlaylists }