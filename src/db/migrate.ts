import { migrate } from 'drizzle-orm/libsql/migrator';
import { db, tursoConnection } from './index';

async function main() {
  console.log('Running migrations')
  await migrate(db, { migrationsFolder: 'src/db/migrations' });
  console.log('Migrated successfully')

  tursoConnection.close();
  process.exit(0)
}

main().catch((e) => {
  console.error('Migration failed')
  console.error(e)
  process.exit(1)
});


