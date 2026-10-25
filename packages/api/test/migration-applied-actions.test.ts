import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { isApplied } from '../src/combats/applied.ts';
import { openDatabase } from '../src/db/index.ts';
import type { OpenedDatabase } from '../src/db/index.ts';
import { runMigrations } from '../src/db/migrate.ts';

const now = '2026-10-25T12:00:00.000Z';
const userId = 'user-1';
const combatId = '01ARZ3NDEKTSV4RRFFQ69G5EA0';
const orc = '01ARZ3NDEKTSV4RRFFQ69G5EA1';
const migrationsFolder = path.resolve(import.meta.dirname, '../drizzle');

const combat = {
  id: combatId,
  title: 'Old combat',
  description: '',
  color: 1,
  status: 'setup',
  round: 1,
  escalation: 0,
  activeUnitId: null,
  lastPlayedAt: null,
  linkGeneration: 0,
  version: 3,
  players: {},
  createdAt: now,
  updatedAt: now,
  units: [],
};

const logged = [
  { seq: 4, actionId: '01ARZ3NDEKTSV4RRFFQ69G5EB0' },
  { seq: 7, actionId: '01ARZ3NDEKTSV4RRFFQ69G5EB1' },
];

let directory: string;
let opened: OpenedDatabase;

beforeAll(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'combat-planner-applied-migration-'));
  const before = path.join(directory, 'drizzle-0006');
  cpSync(migrationsFolder, before, { recursive: true });
  const journalPath = path.join(before, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: unknown[] };
  journal.entries = journal.entries.slice(0, 7);
  writeFileSync(journalPath, JSON.stringify(journal));

  opened = openDatabase(path.join(directory, 'test.db'));
  const { db } = opened;
  migrate(db, { migrationsFolder: before });
  const sqlite = db.$client;
  sqlite
    .prepare("INSERT INTO `user` (`id`, `name`, `email`) VALUES (?, 'DM', 'dm@example.com')")
    .run(userId);
  sqlite
    .prepare(
      'INSERT INTO `combats` (`id`, `ownerId`, `document`, `version`, `title`, `status`, `color`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, 3, ?, ?, 1, ?, ?)',
    )
    .run(combatId, userId, JSON.stringify(combat), combat.title, 'setup', now, now);
  const insertLog = sqlite.prepare(
    'INSERT INTO `action_log` (`combatId`, `seq`, `actionId`, `action`, `author`, `at`, `patch`) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  for (const { seq, actionId } of logged) {
    insertLog.run(
      combatId,
      seq,
      actionId,
      JSON.stringify({ id: actionId, version: seq, type: 'toggleCondition', unitId: orc }),
      JSON.stringify({ kind: 'dm' }),
      now,
      JSON.stringify({ actionId, fields: {}, units: {} }),
    );
  }
  runMigrations(db);
});

afterAll(() => {
  opened.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('migration 0007_applied_actions', () => {
  it('copies every logged action id with its seq into applied_actions', () => {
    const rows = opened.db.$client
      .prepare('SELECT `combatId`, `seq`, `actionId` FROM `applied_actions` ORDER BY `seq`')
      .all();
    expect(rows).toEqual(logged.map((row) => ({ combatId, ...row })));
    for (const { actionId } of logged) {
      expect(isApplied(opened.db, combatId, actionId)).toBe(true);
    }
  });
});
