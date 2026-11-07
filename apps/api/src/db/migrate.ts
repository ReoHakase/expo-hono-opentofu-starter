import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { readDatabaseEnv } from '../env';
import { connectDatabase } from './client';

const { DATABASE_URL: url } = readDatabaseEnv();
const { db, pool } = connectDatabase(url);
try {
  await migrate(db, { migrationsFolder: './drizzle' });
} finally {
  await pool.end();
}
