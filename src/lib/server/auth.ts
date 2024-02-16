import { Lucia } from 'lucia';
import { dev } from '$app/environment';
import { Spotify } from 'arctic';
import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle';
import {
	VITE_SPOTIFY_CLIENT_ID,
	VITE_SPOTIFY_CLIENT_SECRET,
	VITE_BASE_URL
} from '$env/static/private';

import { db } from '../../db';
import { userTable, sessionTable } from '../../db/schema';

export const spotify = new Spotify(
	VITE_SPOTIFY_CLIENT_ID,
	VITE_SPOTIFY_CLIENT_SECRET,
	`${VITE_BASE_URL}/login/spotify/callback`
);

const adapter = new DrizzleSQLiteAdapter(db, userTable, sessionTable);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			secure: !dev
		}
	},
	getUserAttributes: (attributes) => {
		return {
			username: attributes.username
		};
	}
});

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: DatabaseUserAttributes;
	}
}

interface DatabaseUserAttributes {
	username: string;
}
