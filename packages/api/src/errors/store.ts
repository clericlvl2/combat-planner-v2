import { count, desc, gte, lt, sql } from 'drizzle-orm';
import type { Executor } from '../combats/store.ts';
import { errorReports } from '../db/schema.ts';
import type { ErrorFields } from './scrub.ts';
import { scrubErrorFields } from './scrub.ts';

export type ErrorSource = 'client' | 'server';

export const ERROR_RETENTION_DAYS = 14;
export const MAX_ERROR_REPORTS = 500;
export const RECENT_ERRORS = 20;

const DAY_MS = 86_400_000;

export interface ErrorReportRow {
  id: number;
  at: Date;
  source: ErrorSource;
  message: string;
  stack: string | null;
  path: string | null;
  version: string | null;
}

export type ErrorCounts = Record<ErrorSource, number>;

export const recordError = (
  db: Executor,
  source: ErrorSource,
  fields: ErrorFields,
  at: Date = new Date(),
): void => {
  db.insert(errorReports)
    .values({ at: at.getTime(), source, ...scrubErrorFields(fields) })
    .run();
};

export const recentErrors = (db: Executor, limit = RECENT_ERRORS): ErrorReportRow[] =>
  db
    .select()
    .from(errorReports)
    .orderBy(desc(errorReports.at), desc(errorReports.id))
    .limit(limit)
    .all()
    .map((row) => ({ ...row, at: new Date(row.at) }));

export const countErrorsSince = (db: Executor, since: Date): ErrorCounts => {
  const counts: ErrorCounts = { client: 0, server: 0 };
  for (const row of db
    .select({ source: errorReports.source, value: count() })
    .from(errorReports)
    .where(gte(errorReports.at, since.getTime()))
    .groupBy(errorReports.source)
    .all()) {
    counts[row.source] = row.value;
  }
  return counts;
};

export const deleteOldErrors = (db: Executor, now: string): void => {
  const oldest = new Date(now).getTime() - ERROR_RETENTION_DAYS * DAY_MS;
  db.delete(errorReports).where(lt(errorReports.at, oldest)).run();
  db.delete(errorReports)
    .where(
      sql`${errorReports.id} not in (select ${errorReports.id} from ${errorReports} order by ${errorReports.at} desc, ${errorReports.id} desc limit ${MAX_ERROR_REPORTS})`,
    )
    .run();
};
