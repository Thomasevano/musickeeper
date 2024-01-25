import axios from "axios";

async function fetchProfile(token: string): Promise<any> {
  const result = await axios.get("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` }
  });

  return await result.data;
}

async function fetchUserSavedAlbums(token: string): Promise<any> {
  const result = await axios.get("https://api.spotify.com/v1/me/albums", {
    headers: { Authorization: `Bearer ${token}` }
  });

  return await result.data;
}

const fetchUserPlaylists = async ({ token, url = "https://api.spotify.com/v1/me/playlists"}: {token: string; url?: string }): Promise<any> => {
  const result = await axios.get(`${url}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  return await result.data;
}

async function fetchSongsFromPlaylist(token: string, url: string): Promise<any> {
  const result = await axios.get(`${url}`, { headers: { Authorization: `Bearer ${token}` }
  });

  return await result.data;
}

export { fetchProfile ,fetchUserSavedAlbums, fetchUserPlaylists, fetchSongsFromPlaylist }