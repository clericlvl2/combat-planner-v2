import type { Combat } from '@combat-planner/domain';
import { LIMITS, copyCombat, ulidSchema } from '@combat-planner/domain';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { UserAppEnv } from '../app.ts';
import { combatCreateInputSchema, combatPatchSchema } from '../client.ts';
import { broadcast, broadcastDocument } from '../live/registry.ts';
import { dmDocument } from './log.ts';
import type { Transaction } from './store.ts';
import {
  NOT_FOUND,
  countOwnCombats,
  deleteCombat,
  findCombatRow,
  findOwnCombat,
  insertCombat,
  listOwnCombats,
  nowIso,
  saveCombat,
  summaryOf,
} from './store.ts';

const LIMIT_REACHED = {
  code: 'limit',
  message: `A DM keeps at most ${LIMITS.combatsPerDm} combats`,
} as const;

const ID_IN_USE = { code: 'invalid', message: 'This id belongs to another combat' } as const;

type Stored = { combat: Combat } | { rejected: typeof LIMIT_REACHED | typeof ID_IN_USE };

const store = (tx: Transaction, ownerId: string, combat: Combat): Stored => {
  const existing = findCombatRow(tx, combat.id);
  if (existing) {
    return existing.ownerId === ownerId ? { combat: existing.document } : { rejected: ID_IN_USE };
  }
  if (countOwnCombats(tx, ownerId) >= LIMITS.combatsPerDm) return { rejected: LIMIT_REACHED };
  insertCombat(tx, ownerId, combat);
  return { combat };
};

const duplicateBodySchema = z.object({ id: ulidSchema });

export const combatsApp = new Hono<UserAppEnv>()
  .get('/', (c) => c.json(listOwnCombats(c.get('db'), c.get('userId')).map(summaryOf)))
  .post('/', zValidator('json', combatCreateInputSchema), (c) => {
    const input = c.req.valid('json');
    const now = nowIso();
    const combat: Combat = {
      id: input.id,
      title: input.title,
      description: input.description,
      color: input.color,
      status: 'setup',
      round: LIMITS.round.min,
      escalation: LIMITS.escalation.min,
      activeUnitId: null,
      lastPlayedAt: null,
      linkGeneration: 0,
      version: 1,
      players: {},
      createdAt: now,
      updatedAt: now,
      units: [],
    };
    const stored = c.get('db').transaction((tx) => store(tx, c.get('userId'), combat));
    if ('rejected' in stored) return c.json(stored.rejected, 422);
    return c.json(stored.combat);
  })
  .get('/:id', (c) => {
    const db = c.get('db');
    const combat = findOwnCombat(db, c.get('userId'), c.req.param('id'));
    if (!combat) return c.json(NOT_FOUND, 404);
    return c.json(dmDocument(db, combat));
  })
  .patch('/:id', zValidator('json', combatPatchSchema), (c) => {
    const patch = c.req.valid('json');
    const updated = c.get('db').transaction((tx) => {
      const combat = findOwnCombat(tx, c.get('userId'), c.req.param('id'));
      if (!combat) return undefined;
      if (Object.keys(patch).length === 0) return { version: combat.version, document: null };
      const next: Combat = {
        ...combat,
        ...patch,
        version: combat.version + 1,
        updatedAt: nowIso(),
      };
      saveCombat(tx, next);
      return { version: next.version, document: dmDocument(tx, next) };
    });
    if (!updated) return c.json(NOT_FOUND, 404);
    if (updated.document) broadcastDocument(updated.document.id, updated.document);
    return c.json({ version: updated.version });
  })
  .delete('/:id', (c) => {
    const removed = c.get('db').transaction((tx) => {
      const combat = findOwnCombat(tx, c.get('userId'), c.req.param('id'));
      if (!combat) return undefined;
      deleteCombat(tx, combat.id);
      return combat;
    });
    if (!removed) return c.json(NOT_FOUND, 404);
    broadcast(removed.id, { type: 'deleted', title: removed.title });
    return c.body(null, 204);
  })
  .post('/:id/duplicate', zValidator('json', duplicateBodySchema), (c) => {
    const { id } = c.req.valid('json');
    const stored = c.get('db').transaction((tx) => {
      const source = findOwnCombat(tx, c.get('userId'), c.req.param('id'));
      if (!source) return undefined;
      return store(tx, c.get('userId'), copyCombat(source, id, nowIso()));
    });
    if (!stored) return c.json(NOT_FOUND, 404);
    if ('rejected' in stored) return c.json(stored.rejected, 422);
    return c.json(stored.combat);
  })
  .post('/:id/open', (c) => {
    const opened = c.get('db').transaction((tx) => {
      const combat = findOwnCombat(tx, c.get('userId'), c.req.param('id'));
      if (!combat) return undefined;
      const now = nowIso();
      const next: Combat = {
        ...combat,
        lastPlayedAt: now,
        version: combat.version + 1,
        updatedAt: now,
      };
      saveCombat(tx, next);
      return dmDocument(tx, next);
    });
    if (!opened) return c.json(NOT_FOUND, 404);
    broadcastDocument(opened.id, opened);
    return c.json(opened);
  });
