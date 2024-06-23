import { OAuth2RequestError } from 'arctic';
import { generateId } from 'lucia';
import { lucia, spotify } from '$lib/server/auth';
import type { RequestHandler } from './$types';
import { eq, and } from 'drizzle-orm';
import { SPOTIFY_BASE_URL } from '$env/static/private';

import type { RequestEvent } from '@sveltejs/kit';
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
		const tokens = await spotify.validateAuthorizationCode(code);

		const spotifyUserResponse = await fetch(`${SPOTIFY_BASE_URL}/me`, {
			headers: {
				Authorization: `Bearer ${tokens.accessToken}`
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

		if (existingAccount.length > 0) {
			const session = await lucia.createSession(existingAccount[0].userId!, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		} else {
			console.log('Creating User...')
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
			console.log('User created...')
		}
		return new Response(null, {
			status: 302,
			headers: {
				Location: '/library'
			}
		});
	} catch (e) {
		// the specific error message depends on the provider
		console.error(e)
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
