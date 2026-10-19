import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { actionSchema, combatSchema } from '@combat-planner/domain';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { openDatabase } from '../src/db/index.ts';
import type { OpenedDatabase } from '../src/db/index.ts';
import { runMigrations } from '../src/db/migrate.ts';

const now = '2026-10-16T12:00:00.000Z';
const userId = 'user-1';
const combatId = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const unitA = '01ARZ3NDEKTSV4RRFFQ69G5FB0';
const unitB = '01ARZ3NDEKTSV4RRFFQ69G5FB1';
const migrationsFolder = path.resolve(import.meta.dirname, '../drizzle');

const unit = (id: string, conditions: string[]) => ({
  id,
  name: id === unitA ? 'hindered' : 'Orc',
  role: 'enemy',
  initiativeBonus: 0,
  initiative: null,
  maxHp: 40,
  hp: 20,
  tempHp: 0,
  ac: 15,
  pd: 12,
  md: 10,
  note: '',
  conditions,
  disabled: false,
  claimedBy: null,
  hpHistory: [],
});

const document = {
  id: combatId,
  title: 'Old combat',
  description: '',
  color: 1,
  status: 'active',
  round: 1,
  escalation: 0,
  activeUnitId: null,
  lastPlayedAt: null,
  linkGeneration: 0,
  version: 6,
  players: {},
  createdAt: now,
  updatedAt: now,
  units: [
    unit(unitA, ['dazed', 'hindered', 'staggered']),
    unit(unitB, ['staggered']),
    unit('01ARZ3NDEKTSV4RRFFQ69G5FB2', []),
  ],
};

const toggle = (n: number, unitId: string, condition: string) => ({
  id: `01ARZ3NDEKTSV4RRFFQ69G5F${n}0`,
  version: n,
  type: 'toggleCondition',
  unitId,
  condition,
});

const entries = [
  {
    seq: 1,
    action: toggle(1, unitA, 'hindered'),
    patch: { actionId: 'a1', fields: {}, units: { [unitA]: { conditions: [] } } },
  },
  {
    seq: 2,
    action: toggle(2, unitA, 'staggered'),
    patch: { actionId: 'a2', fields: {}, units: { [unitA]: { conditions: ['hindered'] } } },
  },
  {
    seq: 3,
    action: toggle(3, unitB, 'dazed'),
    patch: { actionId: 'a3', fields: {}, units: { [unitB]: { conditions: ['staggered'] } } },
  },
  {
    seq: 4,
    action: { id: '01ARZ3NDEKTSV4RRFFQ69G5F40', version: 4, type: 'removeUnit', unitId: unitB },
    patch: {
      actionId: 'a4',
      fields: { units: [unit(unitA, ['hindered', 'staggered']), unit(unitB, ['staggered'])] },
      units: {},
    },
  },
  {
    seq: 5,
    action: {
      id: '01ARZ3NDEKTSV4RRFFQ69G5F50',
      version: 5,
      type: 'editNote',
      unitId: unitB,
      note: 'x',
    },
    patch: { actionId: 'a5', fields: {}, units: { [unitB]: null } },
  },
];

let directory: string;
let opened: OpenedDatabase;

beforeAll(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'combat-planner-terms-'));
  const firstOnly = path.join(directory, 'drizzle-0000');
  cpSync(migrationsFolder, firstOnly, { recursive: true });
  rmSync(path.join(firstOnly, '0001_13th_age_terms.sql'));
  const journalPath = path.join(firstOnly, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: unknown[] };
  journal.entries = journal.entries.slice(0, 1);
  writeFileSync(journalPath, JSON.stringify(journal));

  opened = openDatabase(path.join(directory, 'test.db'));
  const { db } = opened;
  migrate(db, { migrationsFolder: firstOnly });
  const sqlite = db.$client;
  sqlite
    .prepare("INSERT INTO `user` (`id`, `name`, `email`) VALUES (?, 'DM', 'dm@example.com')")
    .run(userId);
  sqlite
    .prepare(
      'INSERT INTO `combats` (`id`, `ownerId`, `document`, `version`, `title`, `status`, `color`, `createdAt`, `updatedAt`) VALUES (?, ?, ?, 6, ?, ?, 1, ?, ?)',
    )
    .run(combatId, userId, JSON.stringify(document), 'Old combat', 'active', now, now);
  const insert = sqlite.prepare(
    'INSERT INTO `action_log` (`combatId`, `seq`, `actionId`, `action`, `author`, `at`, `patch`) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  for (const entry of entries) {
    insert.run(
      combatId,
      entry.seq,
      entry.action.id,
      JSON.stringify(entry.action),
      JSON.stringify({ kind: 'dm' }),
      now,
      JSON.stringify(entry.patch),
    );
  }
  runMigrations(db);
});

afterAll(() => {
  opened.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('migration 0001_13th_age_terms', () => {
  it('rewrites conditions in the combat document and reads back through combatSchema', () => {
    const row = opened.db.$client
      .prepare('SELECT `document` FROM `combats` WHERE `id` = ?')
      .get(combatId) as { document: string };
    const combat = combatSchema.parse(JSON.parse(row.document));
    expect(combat.units.map((item) => item.conditions)).toEqual([['dazed', 'hampered'], [], []]);
    expect(combat.units[0]?.name).toBe('hindered');
    expect(combat.title).toBe('Old combat');
  });

  it('drops staggered toggles, renames hindered toggles and reads actions back through actionSchema', () => {
    const rows = opened.db.$client
      .prepare('SELECT `seq`, `action` FROM `action_log` ORDER BY `seq`')
      .all() as { seq: number; action: string }[];
    expect(rows.map((row) => row.seq)).toEqual([1, 3, 4, 5]);
    const actions = rows.map((row) => actionSchema.parse(JSON.parse(row.action)));
    expect(actions[0]).toMatchObject({ type: 'toggleCondition', condition: 'hampered' });
  });

  it('rewrites conditions inside patches', () => {
    const rows = opened.db.$client
      .prepare('SELECT `seq`, `patch` FROM `action_log` ORDER BY `seq`')
      .all() as { seq: number; patch: string }[];
    const patches = Object.fromEntries(rows.map((row) => [row.seq, JSON.parse(row.patch)]));
    expect(patches[1].units[unitA]).toEqual({ conditions: [] });
    expect(patches[3].units[unitB]).toEqual({ conditions: [] });
    expect(
      patches[4].fields.units.map((item: { conditions: string[] }) => item.conditions),
    ).toEqual([['hampered'], []]);
    expect(patches[5].units[unitB]).toBeNull();
  });
});
