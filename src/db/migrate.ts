import { migrate } from 'drizzle-orm/libsql/migrator';
import { db, tursoConnection } from './index';

await migrate(db, { migrationsFolder: './migrations' });

tursoConnection.close();
