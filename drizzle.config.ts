import type { Config } from 'drizzle-kit';
import 'dotenv/config'

export default {
	schema: './src/db/schema.ts',
	out: './src/db/migrations',
	dialect: 'sqlite',
	driver: 'turso',
	dbCredentials: {
		url: process.env.TURSO_DATABASE_URL as string,
		authToken: process.env.TURSO_AUTH_TOKEN as string
	},
	verbose: true
} satisfies Config;
