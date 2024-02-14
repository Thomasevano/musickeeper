import { Lucia } from 'lucia';
import { dev } from '$app/environment';
import { BunSQLiteAdapter } from '@lucia-auth/adapter-sqlite';
import { Database } from 'bun:sqlite';

const db = new Database();

const adapter = new BunSQLiteAdapter(db, {
	user: 'user',
	session: 'session'
});

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			// set to `true` when using HTTPS
			secure: !dev
		}
	}
});

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
	}
}
