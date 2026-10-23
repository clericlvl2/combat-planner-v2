import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { combatSchema } from '@combat-planner/domain';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { openDatabase } from '../src/db/index.ts';
import type { OpenedDatabase } from '../src/db/index.ts';
import { runMigrations } from '../src/db/migrate.ts';

const now = '2026-10-20T12:00:00.000Z';
const userId = 'user-1';
const playedId = '01ARZ3NDEKTSV4RRFFQ69G5PA0';
const quietId = '01ARZ3NDEKTSV4RRFFQ69G5PB0';
const heroA = '01ARZ3NDEKTSV4RRFFQ69G5PA1';
const heroB = '01ARZ3NDEKTSV4RRFFQ69G5PA2';
const enemy = '01ARZ3NDEKTSV4RRFFQ69G5PA3';
const playerA = '01ARZ3NDEKTSV4RRFFQ69G5PC1';
const playerB = '01ARZ3NDEKTSV4RRFFQ69G5PC2';
const migrationsFolder = path.resolve(import.meta.dirname, '../drizzle');

const unit = (id: string, role: string, claimedBy: string | null) => ({
  id,
  name: `Unit ${id.slice(-1)}`,
  role,
  initiativeBonus: 0,
  initiative: null,
  maxHp: 40,
  hp: 20,
  tempHp: 0,
  ac: 15,
  pd: 12,
  md: 10,
  note: '',
  conditions: [],
  disabled: false,
  claimedBy,
  hpHistory: [],
});

const combat = (id: string, version: number, units: ReturnType<typeof unit>[]) => ({
  id,
  title: `Combat ${id.slice(-2)}`,
  description: '',
  color: 1,
  status: 'active',
  round: 1,
  escalation: 0,
  activeUnitId: null,
  lastPlayedAt: null,
  linkGeneration: 3,
  version,
  players: units.some((item) => item.claimedBy !== null) ? { [playerA]: 'Ada' } : {},
  createdAt: now,
  updatedAt: now,
  units,
});

const played = combat(playedId, 7, [
  unit(heroA, 'hero', playerA),
  unit(heroB, 'hero', null),
  unit(enemy, 'enemy', null),
]);
const quiet = combat(quietId, 2, []);

const logAction = JSON.stringify({
  id: '01ARZ3NDEKTSV4RRFFQ69G5PD0',
  version: 6,
  type: 'editNote',
  unitId: enemy,
  note: 'x',
});
const logPatch = JSON.stringify({ actionId: 'a1', fields: {}, units: { [enemy]: { note: '' } } });

interface CombatRow {
  document: string;
  version: number;
  linkShared: number;
  updatedAt: string;
}

let directory: string;
let opened: OpenedDatabase;
let migratedAt: number;

const combatRow = (id: string): CombatRow =>
  opened.db.$client
    .prepare(
      'SELECT `document`, `version`, `linkShared`, `updatedAt` FROM `combats` WHERE `id` = ?',
    )
    .get(id) as CombatRow;

const documentOf = (id: string) => combatSchema.parse(JSON.parse(combatRow(id).document));

beforeAll(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'combat-planner-sharing-migration-'));
  const before = path.join(directory, 'drizzle-0001');
  cpSync(migrationsFolder, before, { recursive: true });
  const journalPath = path.join(before, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: unknown[] };
  journal.entries = journal.entries.slice(0, 2);
  writeFileSync(journalPath, JSON.stringify(journal));

  opened = openDatabase(path.join(directory, 'test.db'));
  const { db } = opened;
  migrate(db, { migrationsFolder: before });
  const sqlite = db.$client;
  sqlite
    .prepare("INSERT INTO `user` (`id`, `name`, `email`) VALUES (?, 'DM', 'dm@example.com')")
    .run(userId);
  const insertCombat = sqlite.prepare(
    'INSERT INTO `combats` (`id`, `ownerId`, `document`, `version`, `title`, `status`, `color`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)',
  );
  for (const item of [played, quiet]) {
    insertCombat.run(
      item.id,
      userId,
      JSON.stringify(item),
      item.version,
      item.title,
      'active',
      now,
      now,
    );
  }
  const insertPlayer = sqlite.prepare(
    'INSERT INTO `players` (`combatId`, `playerId`, `displayName`) VALUES (?, ?, ?)',
  );
  insertPlayer.run(playedId, playerA, 'Ada');
  insertPlayer.run(playedId, playerB, '');
  sqlite
    .prepare(
      'INSERT INTO `action_log` (`combatId`, `seq`, `actionId`, `action`, `author`, `at`, `patch`) VALUES (?, 1, ?, ?, ?, ?, ?)',
    )
    .run(playedId, 'a1', logAction, JSON.stringify({ kind: 'dm' }), now, logPatch);
  migratedAt = Date.now();
  runMigrations(db);
});

afterAll(() => {
  opened.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('migration 0002_sharing_lifecycle', () => {
  it('marks as shared only the combats that have players', () => {
    expect(combatRow(playedId).linkShared).toBe(1);
    expect(combatRow(quietId).linkShared).toBe(0);
  });
});

describe('migration 0003_release_claims', () => {
  it('releases every claim, keeps the units in order and bumps the version once', () => {
    const document = documentOf(playedId);
    expect(document.units.map((item) => [item.id, item.claimedBy])).toEqual([
      [heroA, null],
      [heroB, null],
      [enemy, null],
    ]);
    expect(document.units[0]).toEqual({ ...played.units[0], claimedBy: null });
    expect(document.version).toBe(8);
    expect(combatRow(playedId).version).toBe(8);
    expect(documentOf(quietId).units).toEqual([]);
    expect(documentOf(quietId).version).toBe(3);
    expect(combatRow(quietId).version).toBe(3);
  });

  it('keeps the link generation, the players, the last action time and the undo stack', () => {
    const document = documentOf(playedId);
    expect(document.linkGeneration).toBe(3);
    expect(document.players).toEqual({ [playerA]: 'Ada' });
    expect(combatRow(playedId).updatedAt).toBe(now);
    const log = opened.db.$client
      .prepare('SELECT `action`, `patch` FROM `action_log` WHERE `combatId` = ?')
      .all(playedId);
    expect(log).toEqual([{ action: logAction, patch: logPatch }]);
  });

  it('starts the watching timeout of every player, who now holds no hero', () => {
    const rows = opened.db.$client
      .prepare('SELECT `watchingSince` FROM `players` ORDER BY `playerId`')
      .all() as { watchingSince: string | null }[];
    expect(rows).toHaveLength(2);
    for (const { watchingSince } of rows) {
      expect(watchingSince).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
      expect(Date.parse(watchingSince ?? '')).toBeGreaterThanOrEqual(migratedAt - 1000);
    }
  });

  it('runs once', () => {
    runMigrations(opened.db);
    expect(combatRow(playedId).version).toBe(8);
  });
});
