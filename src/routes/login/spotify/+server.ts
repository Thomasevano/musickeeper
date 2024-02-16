import { redirect } from '@sveltejs/kit';
import { generateState } from 'arctic';
import { spotify } from '$lib/server/auth';

import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent): Promise<Response> {
	const state = generateState();
	const scopes = [
		'user-read-private',
		'user-read-email',
		'playlist-read-private',
		'playlist-read-collaborative',
		'playlist-modify-private',
		'playlist-modify-public',
		'user-library-modify',
		'user-library-read'
	];

	const url = await spotify.createAuthorizationURL(state, {
		scopes
	});

	event.cookies.set('spotify_oauth_state', state, {
		path: '/',
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: 'lax'
	});

	redirect(302, url.toString());
}
