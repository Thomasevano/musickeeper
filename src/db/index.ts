import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } from '$env/static/private'
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

export const tursoConnection = createClient({
	url: TURSO_DATABASE_URL!,
	authToken: TURSO_AUTH_TOKEN
});

export const db = drizzle(tursoConnection, { schema });
