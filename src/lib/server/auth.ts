import { Lucia } from 'lucia';
import { dev } from '$app/environment';
import { Spotify } from 'arctic';
import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle';
import {
	env
} from '$env/dynamic/private';

import { db } from '../../db';
import { userTable, sessionTable } from '../../db/schema';

export const spotify = new Spotify(
	env.SPOTIFY_CLIENT_ID,
	env.SPOTIFY_CLIENT_SECRET,
	`${env.VITE_BASE_URL}/login/spotify/callback`
);

const adapter = new DrizzleSQLiteAdapter(db, sessionTable, userTable);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			secure: !dev
		}
	},
	getUserAttributes: (attributes) => {
		return {
			username: attributes.username,
			email: attributes.email
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
	email: string;
}
