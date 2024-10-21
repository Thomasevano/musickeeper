import type { LayoutServerLoad } from "./$types";
import type { providerAuthTokens } from "../../../types";

export const load: LayoutServerLoad = async ({ cookies }) => {
  const spotifyAccessToken = cookies.get('spotify_access_token');
  const spotifyRefreshToken = cookies.get('spotify_refresh_token');
  const spotifyAccessTokenExpiresAt = cookies.get('spotify_access_token_expires_at');

  if (!spotifyAccessToken) {
    console.error('No access token found!');
  }

  const spotifyTokens: providerAuthTokens = {
    accessToken: spotifyAccessToken!,
    refreshToken: spotifyRefreshToken!,
    expiresAt: spotifyAccessTokenExpiresAt!
  }


  return {
    tokens: { spotifyTokens },
  }
}