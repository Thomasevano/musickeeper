import type { PaginatedPlaylistsInfos, providerTokens } from "../types";

export const api = (customFetch = fetch) => ({
  getCurrentUserPlaylists: async (tokens: providerTokens): Promise<PaginatedPlaylistsInfos> => {
    const result = await customFetch(`${import.meta.env.VITE_API_URL}/spotify/me/playlists`, {
      headers: {
        Cookie: `spotify_access_token=${tokens.accessToken}; spotify_refresh_token=${tokens.refreshToken}; spotify_access_token_expires_at=${tokens.expiresAt}`
      },
      credentials: 'include'
    });
    const data = await result.json();
    return data;
  },

  getUserPlaylistsInfos: async (tokens: providerTokens, url: string): Promise<PaginatedPlaylistsInfos> => {
    const result = await customFetch(url, {
      headers: {
        Cookie: `spotify_access_token=${tokens.accessToken}; spotify_refresh_token=${tokens.refreshToken}; spotify_access_token_expires_at=${tokens.expiresAt}`
      },
      credentials: 'include'
    });
    const data = await result.json()
    return data;
  }
})