import type { Config } from 'drizzle-kit';
import 'dotenv/config'

export default {
	schema: './src/db/schema.ts',
	out: './src/db/migrations',
	driver: 'turso',
	dbCredentials: {
		url: process.env.TURSO_DATABASE_URL!,
		authToken: process.env.TURSO_AUTH_TOKEN
	}
} satisfies Config;
