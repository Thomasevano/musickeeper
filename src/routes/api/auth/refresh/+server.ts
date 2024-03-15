import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { SPOTIFY_BASIC_TOKEN } from '$env/static/private';

export const GET: RequestHandler = async ({ cookies, fetch }) => {
  const refreshToken = cookies.get('spotify_refresh_token');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${SPOTIFY_BASIC_TOKEN}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken || ''
    })
  });

  const responseJSON = await response.json();
  if (responseJSON.error) {
    cookies.delete('spotify_access_token', { path: '/' });
    cookies.delete('spotify_refresh_token', { path: '/' });
    throw error(401, responseJSON.error_description);
  }

  cookies.set('spotify_refresh_token', responseJSON.refresh_token, { path: '/' });
  cookies.set('spotify_access_token', responseJSON.access_token, { path: '/' });

  return json(responseJSON);
};
