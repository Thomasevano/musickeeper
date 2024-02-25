import { OAuth2RequestError } from 'arctic';
import { generateId } from 'lucia';
import { lucia } from '$lib/server/auth';
import type { RequestHandler } from './$types';
import { eq, and } from 'drizzle-orm';
import { VITE_SPOTIFY_CLIENT_ID, VITE_BASE_URL, VITE_BASIC_TOKEN } from '$env/static/private';

import type { RequestEvent } from '@sveltejs/kit';
import { VITE_SPOTIFY_BASE_URL } from '$env/static/private';
import { db } from '../../../../db';
import { OAuthAccountTable, userTable } from '../../../../db/schema';

export const GET: RequestHandler = async (event: RequestEvent): Promise<Response> => {
	const code = event.url.searchParams.get('code');
	const state = event.url.searchParams.get('state');
	const storedState = event.cookies.get('spotify_oauth_state') ?? null;

	if (!code || !state || !storedState || state !== storedState) {
		return new Response(null, {
			status: 400
		});
	}

	try {
		// const tokens = await spotify.validateAuthorizationCode(code);
		const response = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${VITE_BASIC_TOKEN}`
			},
			body: new URLSearchParams({
				code: code || '',
				redirect_uri: `${VITE_BASE_URL}/login/spotify/callback`,
				grant_type: 'authorization_code',
				client_id: VITE_SPOTIFY_CLIENT_ID
			})
		});
		const tokens = await response.json();

		if (tokens.error) {
			console.log('error: 400, ', tokens.error_description);
		}
		const spotifyUserResponse = await fetch(`${VITE_SPOTIFY_BASE_URL}/me`, {
			headers: {
				Authorization: `Bearer ${tokens.access_token}`
			}
		});
		const spotifyUser: SpotifyApi.CurrentUsersProfileResponse = await spotifyUserResponse.json();

		const existingAccount = await db
			.select()
			.from(OAuthAccountTable)
			.where(
				and(
					eq(OAuthAccountTable.providerId, 'spotify'),
					eq(OAuthAccountTable.providerUserId, spotifyUser.id)
				)
			);

		console.log({ existingAccount });

		if (existingAccount.length > 0) {
			const session = await lucia.createSession(existingAccount[0].userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		} else {
			const userId = generateId(15);

			await db.batch([
				db.insert(userTable).values({
					id: userId,
					username: spotifyUser.display_name,
					email: spotifyUser.email
				}),
				db.insert(OAuthAccountTable).values({
					providerId: 'spotify',
					providerUserId: spotifyUser.id,
					userId: userId
				})
			]);

			const session = await lucia.createSession(userId, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		}
		return new Response(null, {
			status: 302,
			headers: {
				Location: '/dashboard'
			}
		});
	} catch (e) {
		// the specific error message depends on the provider
		if (e instanceof OAuth2RequestError) {
			// invalid code
			return new Response(null, {
				status: 400
			});
		}
		return new Response(null, {
			status: 500
		});
	}
};
