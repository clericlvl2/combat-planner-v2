import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { combatSchema } from '@combat-planner/domain';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { openDatabase } from '../src/db/index.ts';
import type { OpenedDatabase } from '../src/db/index.ts';
import { runMigrations } from '../src/db/migrate.ts';

const now = '2026-10-23T12:00:00.000Z';
const userId = 'user-1';
const combatId = '01ARZ3NDEKTSV4RRFFQ69G5DA0';
const emptyId = '01ARZ3NDEKTSV4RRFFQ69G5DB0';
const orc = '01ARZ3NDEKTSV4RRFFQ69G5DA1';
const hero = '01ARZ3NDEKTSV4RRFFQ69G5DA2';
const migrationsFolder = path.resolve(import.meta.dirname, '../drizzle');

const unit = (id: string, mods: Record<string, number> = {}) => ({
  id,
  name: `Unit ${id.slice(-1)}`,
  role: 'enemy',
  initiativeBonus: 0,
  initiative: null,
  maxHp: 40,
  hp: 20,
  tempHp: 0,
  ac: 18,
  pd: 12,
  md: 10,
  ...mods,
  note: '',
  conditions: [],
  disabled: false,
  claimedBy: null,
  hpHistory: [],
});

const combat = (id: string, units: ReturnType<typeof unit>[]) => ({
  id,
  title: 'Old combat',
  description: '',
  color: 1,
  status: 'setup',
  round: 1,
  escalation: 0,
  activeUnitId: null,
  lastPlayedAt: null,
  linkGeneration: 0,
  version: 5,
  players: {},
  createdAt: now,
  updatedAt: now,
  units,
});

const stored = combat(combatId, [unit(orc), unit(hero, { acMod: 2, pdMod: -1, mdMod: 0 })]);
const removePatch = {
  actionId: 'a1',
  fields: { units: [unit(orc)] },
  units: {},
};

let directory: string;
let opened: OpenedDatabase;

const rawDocument = (id: string) =>
  JSON.parse(
    (
      opened.db.$client
        .prepare('SELECT `document`, `version` FROM `combats` WHERE `id` = ?')
        .get(id) as {
        document: string;
      }
    ).document,
  ) as { units: Record<string, unknown>[]; version: number };

beforeAll(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'combat-planner-defense-migration-'));
  const before = path.join(directory, 'drizzle-0005');
  cpSync(migrationsFolder, before, { recursive: true });
  const journalPath = path.join(before, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: unknown[] };
  journal.entries = journal.entries.slice(0, 6);
  writeFileSync(journalPath, JSON.stringify(journal));

  opened = openDatabase(path.join(directory, 'test.db'));
  const { db } = opened;
  migrate(db, { migrationsFolder: before });
  const sqlite = db.$client;
  sqlite
    .prepare("INSERT INTO `user` (`id`, `name`, `email`) VALUES (?, 'DM', 'dm@example.com')")
    .run(userId);
  const insertCombat = sqlite.prepare(
    'INSERT INTO `combats` (`id`, `ownerId`, `document`, `version`, `title`, `status`, `color`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, 5, ?, ?, 1, ?, ?)',
  );
  for (const item of [stored, combat(emptyId, [])]) {
    insertCombat.run(item.id, userId, JSON.stringify(item), item.title, 'setup', now, now);
  }
  sqlite
    .prepare(
      'INSERT INTO `action_log` (`combatId`, `seq`, `actionId`, `action`, `author`, `at`, `patch`) VALUES (?, 1, ?, ?, ?, ?, ?)',
    )
    .run(
      combatId,
      'a1',
      JSON.stringify({ id: 'a1', version: 4, type: 'removeUnit', unitId: orc }),
      JSON.stringify({ kind: 'dm' }),
      now,
      JSON.stringify(removePatch),
    );
  runMigrations(db);
});

afterAll(() => {
  opened.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('migration 0006_defense_mods', () => {
  it('stores modifiers 0 on every unit that had none and keeps the ones set', () => {
    const document = rawDocument(combatId);
    expect(document.units.map((item) => [item.id, item.acMod, item.pdMod, item.mdMod])).toEqual([
      [orc, 0, 0, 0],
      [hero, 2, -1, 0],
    ]);
    expect(document.units[0]).toEqual({ ...unit(orc), acMod: 0, pdMod: 0, mdMod: 0 });
    expect(document.version).toBe(5);
    expect(combatSchema.safeParse(document).success).toBe(true);
    expect(rawDocument(emptyId).units).toEqual([]);
  });

  it('stores modifiers 0 on the units an undo would bring back', () => {
    const row = opened.db.$client
      .prepare('SELECT `patch` FROM `action_log` WHERE `combatId` = ?')
      .get(combatId) as { patch: string };
    expect(JSON.parse(row.patch)).toEqual({
      ...removePatch,
      fields: { units: [{ ...unit(orc), acMod: 0, pdMod: 0, mdMod: 0 }] },
    });
  });
});
