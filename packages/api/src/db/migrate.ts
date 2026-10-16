import path from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import type { AppDatabase } from './index.ts';

const migrationsFolder = path.resolve(import.meta.dirname, '../../drizzle');

export function runMigrations(db: AppDatabase): void {
  migrate(db, { migrationsFolder });
}
