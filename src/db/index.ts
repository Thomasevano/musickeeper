import { type LibSQLDatabase, drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import 'dotenv/config'

// export const tursoConnection = () => createClient({
// 	url: process.env.TURSO_DATABASE_URL as string,
// 	authToken: process.env.TURSO_AUTH_TOKEN as string
// });

console.log('database url', import.meta.env.VITE_TURSO_DATABASE_URL)
export function tursoClient(): LibSQLDatabase<typeof schema> {
	const url = import.meta.env.VITE_TURSO_DATABASE_URL?.trim();
	if (url === undefined) {
		throw new Error('TURSO_DATABASE_URL is not defined', url);
	}

	const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN?.trim();
	if (authToken === undefined && !url.includes('file:')) {
		throw new Error('TURSO_AUTH_TOKEN is not defined');
	}

	return drizzle(
		createClient({
			url,
			authToken
		}),
		{ schema }
	);
}
export const db = tursoClient();
