import type { PaginatedPlaylistsInfos, spotifyTokens } from "../types";

export const api = (customFetch = fetch) => ({
  getUserPlaylists: async (tokens: spotifyTokens): Promise<PaginatedPlaylistsInfos> => {
    const result = await customFetch(`${import.meta.env.VITE_API_URL}/spotify/me/playlists`, {
      headers: {
        Cookie: `spotify_access_token=${tokens.accessToken}; spotify_refresh_token=${tokens.refreshToken}; spotify_access_token_expires_at=${tokens.expiresAt}`
      }
    });
    const data = await result.json();
    return data;
  },

  getUserNextPlaylists: async (tokens: spotifyTokens, url: string): Promise<PaginatedPlaylistsInfos> => {
    const result = await customFetch(url, {
      headers: {
        Cookie: `spotify_access_token=${tokens.accessToken}; spotify_refresh_token=${tokens.refreshToken}; spotify_access_token_expires_at=${tokens.expiresAt}`
      }
    });
    const data = await result.json()
    return data;
  }
})