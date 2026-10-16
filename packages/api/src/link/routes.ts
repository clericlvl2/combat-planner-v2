import type { Action, Combat, Viewer } from '@combat-planner/domain';
import { DomainError, apply } from '@combat-planner/domain';
import { Hono } from 'hono';
import { ulid } from 'ulid';
import type { ApiAppEnv } from '../app.ts';
import { requireUser } from '../auth/require-user.ts';
import { appendLogEntry, nextSeq } from '../combats/log.ts';
import type { Transaction } from '../combats/store.ts';
import { NOT_FOUND, findOwnCombat, nowIso, saveCombat } from '../combats/store.ts';
import { broadcast, broadcastDocument } from '../live/registry.ts';
import { signLink } from './token.ts';

const DM: Viewer = { kind: 'dm' };

const releaseEveryClaim = (tx: Transaction, source: Combat, now: string): Combat => {
  let combat = source;
  let seq = nextSeq(tx, combat.id);
  for (const unit of source.units) {
    if (unit.claimedBy === null) continue;
    const action: Action = {
      id: ulid(),
      version: combat.version,
      type: 'releaseUnit',
      unitId: unit.id,
    };
    const result = apply(combat, action, DM, now);
    if (result instanceof DomainError) throw result;
    combat = result.combat;
    appendLogEntry(tx, combat.id, seq, {
      action,
      author: DM,
      at: now,
      patch: result.patch,
      undoneBy: null,
    });
    seq += 1;
  }
  return combat;
};

const reissue = (tx: Transaction, ownerId: string, combatId: string): Combat | undefined => {
  const combat = findOwnCombat(tx, ownerId, combatId);
  if (!combat) return undefined;
  const now = nowIso();
  const released = releaseEveryClaim(tx, combat, now);
  const next: Combat = {
    ...released,
    linkGeneration: released.linkGeneration + 1,
    version: released.version + 1,
    updatedAt: now,
  };
  saveCombat(tx, next);
  return next;
};

export const linkApp = new Hono<ApiAppEnv>()
  .use(requireUser)
  .get('/:id/link', (c) => {
    const combat = findOwnCombat(c.get('db'), c.get('userId'), c.req.param('id'));
    if (!combat) return c.json(NOT_FOUND, 404);
    const generation = combat.linkGeneration;
    const token = signLink({ combatId: combat.id, generation }, c.get('env').linkSecret);
    return c.json({ token, generation });
  })
  .post('/:id/link/reissue', (c) => {
    const combat = c.get('db').transaction((tx) => reissue(tx, c.get('userId'), c.req.param('id')));
    if (!combat) return c.json(NOT_FOUND, 404);
    broadcastDocument(combat.id, combat, 'dm');
    broadcast(combat.id, { type: 'linkRevoked' }, 'player');
    const token = signLink(
      { combatId: combat.id, generation: combat.linkGeneration },
      c.get('env').linkSecret,
    );
    return c.json({ token, version: combat.version });
  });
