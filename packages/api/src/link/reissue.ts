import type { Action, Combat, LinkState, Viewer } from '@combat-planner/domain';
import { DomainError, apply } from '@combat-planner/domain';
import { ulid } from 'ulid';
import type { DmCombat } from '../client.ts';
import { dmDocument, readStack, recordAction } from '../combats/log.ts';
import type { Transaction } from '../combats/store.ts';
import { saveCombat } from '../combats/store.ts';
import { broadcast, broadcastDocument } from '../live/registry.ts';
import { deletePlayers, writeLink } from '../sharing/store.ts';

const DM: Viewer = { kind: 'dm' };

const releaseEveryClaim = (tx: Transaction, source: Combat, now: string): Combat => {
  let combat = source;
  let stack = readStack(tx, combat.id);
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
    stack = recordAction(tx, combat.id, stack, {
      action,
      author: DM,
      at: now,
      patch: result.patch,
    });
  }
  return combat;
};

export const reissueGeneration = (
  tx: Transaction,
  combat: Combat,
  link: LinkState,
  now: string,
): DmCombat => {
  const released = releaseEveryClaim(tx, combat, now);
  const next: Combat = {
    ...released,
    linkGeneration: released.linkGeneration + 1,
    version: released.version + 1,
    updatedAt: now,
  };
  saveCombat(tx, next);
  deletePlayers(tx, next.id);
  writeLink(tx, next.id, link);
  return dmDocument(tx, next);
};

export const announceReissue = (combat: DmCombat): void => {
  broadcastDocument(combat.id, combat, 'dm');
  broadcast(combat.id, { type: 'linkRevoked' }, 'player');
};
