import { lucia } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(lucia.sessionCookieName);
	const spotifyRefreshToken = event.cookies.get('spotify_refresh_token');
	const spotifyAccessToken = event.cookies.get('spotify_access_token');
	const spotifyAccessExpiresAt = event.cookies.get('spotify_access_token_expires-at')

	const now = Math.floor(Date.now() / 1000);
	const difference = Math.floor((parseInt(spotifyAccessExpiresAt!) - now) / 60);

	if (spotifyAccessToken && difference < 5) {
		try {
			const response = await fetch('https://accounts.spotify.com/api/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${env.SPOTIFY_BASIC_TOKEN}`
				},
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					refresh_token: spotifyRefreshToken || ''
				})
			});
			const responseJSON = await response.json();

			event.cookies.set('spotify_refresh_token', responseJSON.refresh_token, { path: '/' });
			event.cookies.set('spotify_access_token', responseJSON.access_token, { path: '/' });

			const now = Math.floor(Date.now() / 1000);
			const spotifyAccessExpiresAt = now + responseJSON.expires_in;
			event.cookies.set('spotify_access_token_expires-at', spotifyAccessExpiresAt.toString(), { path: '/' })

		} catch (error) {
			event.cookies.delete('spotify_access_token', { path: '/' });
			event.cookies.delete('spotify_refresh_token', { path: '/' });
			event.cookies.delete('spotify_access_token_expires-at', { path: '/' });
			console.log(error)
			// throw error(401, responseJSON.error_description);
		}
	}
	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await lucia.validateSession(sessionId);
	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		// sveltekit types deviates from the de-facto standard
		// you can use 'as any' too
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}
	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}
	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};
