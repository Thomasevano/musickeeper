import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {

  const spotifyRefreshToken = event.cookies.get('spotify_refresh_token');
  const spotifyAccessToken = event.cookies.get('spotify_access_token');
  const spotifyAccessTokenExpiresAt = event.cookies.get('spotify_access_token_expires_at')
  const now = Math.floor(Date.now() / 1000);
  const spotifyAccessTokenExpiresIn = Math.floor((Number.parseInt(spotifyAccessTokenExpiresAt) - now) / 60);

  console.log({ spotifyAccessToken, spotifyAccessTokenExpiresAt, now, spotifyRefreshToken, spotifyAccessTokenExpiresIn });

  if (spotifyAccessToken && spotifyAccessTokenExpiresIn < 3) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/spotify/refresh`, {
        headers: {
          'Content-Type': 'application/json',
          Cookie: `spotify_refresh_token=${spotifyRefreshToken}`,
        },
      });
      const cookies = response.headers.getSetCookie();

      cookies.map((cookie) => {
        if (cookie.includes('spotify_access_token=')) {
          event.cookies.set('spotify_access_token', cookie.split('=')[1].split(';')[0], { path: '/' });
        }
        if (cookie.includes('spotify_access_token_expires_at=')) {
          event.cookies.set('spotify_access_token_expires_at', cookie.split('=')[1].split(';')[0], { path: '/' });
        }
      });
    } catch (error) {
      console.log(error);
    }
  }
  return resolve(event)
}