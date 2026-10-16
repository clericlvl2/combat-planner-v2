import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Action, Combat, Patch, Viewer } from '@combat-planner/domain';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import { openDatabase } from '../src/db/index.ts';
import type { OpenedDatabase } from '../src/db/index.ts';
import { runMigrations } from '../src/db/migrate.ts';
import {
  account,
  actionLog,
  combats,
  players,
  presetTags,
  presets,
  session,
  tags,
  user,
  verification,
} from '../src/db/schema.ts';

const now = '2026-10-16T12:00:00.000Z';
const at = new Date(now);
const userId = 'user-1';
const combatId = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const playerId = '01ARZ3NDEKTSV4RRFFQ69G5FAW';
const actionId = '01ARZ3NDEKTSV4RRFFQ69G5FAX';
const presetId = '01ARZ3NDEKTSV4RRFFQ69G5FAY';
const tagId = '01ARZ3NDEKTSV4RRFFQ69G5FAZ';

const combat: Combat = {
  id: combatId,
  title: 'Goblin ambush',
  description: '',
  color: 7,
  status: 'setup',
  round: 1,
  escalation: 0,
  activeUnitId: null,
  lastPlayedAt: null,
  linkGeneration: 0,
  version: 1,
  players: { [playerId]: 'Ada' },
  createdAt: now,
  updatedAt: now,
  units: [],
};

const action: Action = { id: actionId, version: 0, type: 'setEscalation', escalation: 2 };
const author: Viewer = { kind: 'dm' };
const patch: Patch = { actionId, fields: { escalation: 0 }, units: {} };

let directory: string;
let opened: OpenedDatabase;

beforeAll(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'combat-planner-db-'));
  opened = openDatabase(path.join(directory, 'test.db'));
  runMigrations(opened.db);
});

afterAll(() => {
  opened.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('openDatabase', () => {
  it('turns WAL mode and foreign keys on', () => {
    expect(opened.db.$client.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(opened.db.$client.pragma('foreign_keys', { simple: true })).toBe(1);
  });
});

describe('migrated tables', () => {
  it('round-trips a user with the default language', () => {
    const { db } = opened;
    db.insert(user)
      .values({ id: userId, name: 'DM', email: 'dm@example.com', createdAt: at, updatedAt: at })
      .run();
    const row = db.select().from(user).where(eq(user.id, userId)).get();
    expect(row).toMatchObject({ id: userId, email: 'dm@example.com', emailVerified: false });
    expect(row?.language).toBe('en');
    expect(row?.createdAt).toEqual(at);
  });

  it('round-trips a session', () => {
    const { db } = opened;
    db.insert(session)
      .values({
        id: 'session-1',
        token: 'token-1',
        expiresAt: at,
        userId,
        createdAt: at,
        updatedAt: at,
      })
      .run();
    const row = db.select().from(session).where(eq(session.id, 'session-1')).get();
    expect(row).toMatchObject({ token: 'token-1', userId, ipAddress: null });
    expect(row?.expiresAt).toEqual(at);
  });

  it('round-trips an account', () => {
    const { db } = opened;
    db.insert(account)
      .values({
        id: 'account-1',
        accountId: userId,
        providerId: 'credential',
        userId,
        password: 'hashed',
        createdAt: at,
        updatedAt: at,
      })
      .run();
    const row = db.select().from(account).where(eq(account.id, 'account-1')).get();
    expect(row).toMatchObject({ providerId: 'credential', password: 'hashed', accessToken: null });
  });

  it('round-trips a verification', () => {
    const { db } = opened;
    db.insert(verification)
      .values({
        id: 'verification-1',
        identifier: 'dm@example.com',
        value: 'code',
        expiresAt: at,
        createdAt: at,
        updatedAt: at,
      })
      .run();
    const row = db.select().from(verification).where(eq(verification.id, 'verification-1')).get();
    expect(row).toMatchObject({ identifier: 'dm@example.com', value: 'code' });
  });

  it('round-trips a combat with its document as JSON', () => {
    const { db } = opened;
    db.insert(combats)
      .values({
        id: combatId,
        ownerId: userId,
        document: combat,
        version: combat.version,
        title: combat.title,
        status: combat.status,
        color: combat.color,
        lastPlayedAt: combat.lastPlayedAt,
        createdAt: combat.createdAt,
        updatedAt: combat.updatedAt,
      })
      .run();
    const row = db.select().from(combats).where(eq(combats.id, combatId)).get();
    expect(row?.document).toEqual(combat);
    expect(row).toMatchObject({
      ownerId: userId,
      version: 1,
      title: 'Goblin ambush',
      status: 'setup',
    });
  });

  it('round-trips an action log entry', () => {
    const { db } = opened;
    db.insert(actionLog)
      .values({ combatId, seq: 1, actionId, action, author, at: now, patch, undoneBy: null })
      .run();
    const row = db
      .select()
      .from(actionLog)
      .where(and(eq(actionLog.combatId, combatId), eq(actionLog.seq, 1)))
      .get();
    expect(row).toEqual({
      combatId,
      seq: 1,
      actionId,
      action,
      author,
      at: now,
      patch,
      undoneBy: null,
    });
  });

  it('rejects a second entry with the same action id in one combat', () => {
    const { db } = opened;
    expect(() =>
      db
        .insert(actionLog)
        .values({
          combatId,
          seq: 2,
          actionId,
          action,
          author,
          at: now,
          patch: null,
          undoneBy: null,
        })
        .run(),
    ).toThrow(/UNIQUE/);
  });

  it('round-trips a player', () => {
    const { db } = opened;
    db.insert(players).values({ combatId, playerId, displayName: 'Ada' }).run();
    const row = db
      .select()
      .from(players)
      .where(and(eq(players.combatId, combatId), eq(players.playerId, playerId)))
      .get();
    expect(row).toEqual({ combatId, playerId, displayName: 'Ada' });
  });

  it('round-trips a preset', () => {
    const { db } = opened;
    db.insert(presets)
      .values({
        id: presetId,
        ownerId: userId,
        name: 'Goblin',
        role: 'enemy',
        maxHp: 12,
        ac: 16,
        pd: 14,
        md: 11,
        initiativeBonus: 2,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const row = db.select().from(presets).where(eq(presets.id, presetId)).get();
    expect(row).toMatchObject({ name: 'Goblin', role: 'enemy', maxHp: 12, initiativeBonus: 2 });
  });

  it('round-trips a tag and rejects a case-insensitive duplicate per owner', () => {
    const { db } = opened;
    db.insert(tags)
      .values({ id: tagId, ownerId: userId, name: 'Undead', nameLower: 'undead' })
      .run();
    const row = db.select().from(tags).where(eq(tags.id, tagId)).get();
    expect(row).toEqual({ id: tagId, ownerId: userId, name: 'Undead', nameLower: 'undead' });
    expect(() =>
      db
        .insert(tags)
        .values({
          id: '01ARZ3NDEKTSV4RRFFQ69G5FB0',
          ownerId: userId,
          name: 'UNDEAD',
          nameLower: 'undead',
        })
        .run(),
    ).toThrow(/UNIQUE/);
  });

  it('round-trips a preset tag', () => {
    const { db } = opened;
    db.insert(presetTags).values({ presetId, tagId }).run();
    const row = db.select().from(presetTags).where(eq(presetTags.presetId, presetId)).get();
    expect(row).toEqual({ presetId, tagId });
  });

  it('cascades a user deletion to combats, presets and tags', () => {
    const { db } = opened;
    db.delete(user).where(eq(user.id, userId)).run();
    expect(db.select().from(combats).all()).toEqual([]);
    expect(db.select().from(actionLog).all()).toEqual([]);
    expect(db.select().from(players).all()).toEqual([]);
    expect(db.select().from(presets).all()).toEqual([]);
    expect(db.select().from(tags).all()).toEqual([]);
    expect(db.select().from(presetTags).all()).toEqual([]);
  });
});
