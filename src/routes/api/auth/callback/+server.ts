import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SPOTIFY_BASIC_TOKEN, SPOTIFY_CLIENT_ID } from '$env/static/private'

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
  const code = url.searchParams.get('code') || null;
  const state = url.searchParams.get('state') || null;

  const storedState = cookies.get('spotify_auth_state') || null;
  // const storedChallengeVerifier = cookies.get('spotify_auth_challenge_verifier') || null;

  if (state === null || state !== storedState) {
    throw error(400, 'State Mismatch!');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${SPOTIFY_BASIC_TOKEN}`
    },
    body: new URLSearchParams({
      code: code || '',
      redirect_uri: `${import.meta.env.VITE_BASE_URL}/api/auth/callback`,
      grant_type: 'authorization_code',
      code_verifier: storedState || '',
      client_id: SPOTIFY_CLIENT_ID
    })
  });
  const responseJSON = await response.json();

  if (responseJSON.error) {
    throw error(400, responseJSON.error_description);
  }

  cookies.delete('spotify_auth_state', { path: '/' });
  cookies.delete('spotify_auth_challenge_verifier', { path: '/' });
  cookies.set('spotify_refresh_token', responseJSON.refresh_token, { path: '/' });
  cookies.set('spotify_access_token', responseJSON.access_token, { path: '/' });

  const now = Math.floor(Date.now() / 1000);
  const spotifyAccessExpiresAt = now + responseJSON.expires_in;
  cookies.set('spotify_access_token_expires-at', spotifyAccessExpiresAt.toString(), { path: '/' })

  throw redirect(303, '/library/playlists');
};
