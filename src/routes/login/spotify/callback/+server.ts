import { OAuth2RequestError } from 'arctic';
import { generateId } from 'lucia';
import { spotify, lucia } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

import type { RequestEvent } from '@sveltejs/kit';
import { VITE_SPOTIFY_BASE_URL } from '$env/static/private';
import { db } from '../../../../db';
import { OAuthAccountTable, userTable } from '../../../../db/schema';

export async function GET(event: RequestEvent): Promise<Response> {
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
		const spotifyUserResponse = await fetch(`${VITE_SPOTIFY_BASE_URL}/me`, {
			headers: {
				Authorization: `Bearer ${tokens.accessToken}`
			}
		});
		const spotifyUser: SpotifyApi.CurrentUsersProfileResponse = await spotifyUserResponse.json();

		const existingAccount = await db
			.select()
			.from(OAuthAccountTable)
			.where(eq(spotifyUser.id, 'spotify_id'));

		if (existingAccount) {
			const session = await lucia.createSession(existingAccount.id, {});
			const sessionCookie = lucia.createSessionCookie(session.id);
			event.cookies.set(sessionCookie.name, sessionCookie.value, {
				path: '.',
				...sessionCookie.attributes
			});
		} else {
			const userId = generateId(15);

			await db.transaction(async (tx) => {
				await tx.insert(userTable).values({
					id: userId,
					username: spotifyUser.display_name
				});
				await tx.insert(OAuthAccountTable).values({
					providerId: 'spotify',
					providerUserId: spotifyUser.id,
					userId: userId
				});
			});

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
			console.log(e.message);
			console.log(e.description);
		}
		return new Response(null, {
			status: 500
		});
		console.log(e);
	}
}
