import type { Action, Combat, CombatId, DomainErrorCode, Viewer } from '@combat-planner/domain';
import { DomainError, apply } from '@combat-planner/domain';
import type { DmCombat } from '../client.ts';
import type { AppDatabase } from '../db/index.ts';
import { broadcastDocument } from '../live/registry.ts';
import { followCombatClaims } from '../sharing/store.ts';
import { countAction } from '../stats/store.ts';
import { isApplied, recordApplied } from './applied.ts';
import { dmDocument, lastActionsOf, readStack, recordAction } from './log.ts';
import type { Transaction } from './store.ts';
import { findCombatRow, saveCombat } from './store.ts';

export interface DispatchRequest {
  combatId: CombatId;
  ownerId?: string;
  viewer: Viewer;
  action: Action;
  now: string;
}

export type DispatchStatus = 403 | 404 | 409 | 422;

export interface DispatchRejected {
  ok: false;
  status: DispatchStatus;
  code: DomainErrorCode;
  message: string;
}

export interface DispatchApplied {
  ok: true;
  version: number;
  combat: Combat;
  document: DmCombat;
  repeated: boolean;
}

export type DispatchOutcome = DispatchApplied | DispatchRejected;

const STATUS_OF: Record<DomainErrorCode, DispatchStatus> = {
  version: 409,
  forbidden: 403,
  blocked: 422,
  limit: 422,
  invalid: 422,
  notFound: 404,
};

const rejected = (code: DomainErrorCode, message: string): DispatchRejected => ({
  ok: false,
  status: STATUS_OF[code],
  code,
  message,
});

const run = (
  tx: Transaction,
  { combatId, ownerId, viewer, action, now }: DispatchRequest,
): DispatchOutcome => {
  const row = findCombatRow(tx, combatId);
  if (!row || (ownerId !== undefined && row.ownerId !== ownerId)) {
    return rejected('notFound', 'Combat not found');
  }
  const combat = row.document;
  if (isApplied(tx, combatId, action.id)) {
    return {
      ok: true,
      version: combat.version,
      combat,
      document: dmDocument(tx, combat),
      repeated: true,
    };
  }
  if (action.version !== combat.version) {
    return rejected(
      'version',
      `Action version ${action.version} does not match combat version ${combat.version}`,
    );
  }
  const stack = readStack(tx, combatId);
  const result = apply(combat, action, viewer, now, stack);
  if (result instanceof DomainError) return rejected(result.code, result.message);
  saveCombat(tx, result.combat);
  followCombatClaims(tx, result.combat, now);
  recordAction(tx, combatId, stack, { action, author: viewer, at: now, patch: result.patch });
  recordApplied(tx, combatId, action.id);
  countAction(tx, now);
  return {
    ok: true,
    version: result.combat.version,
    combat: result.combat,
    document: dmDocument(tx, result.combat),
    repeated: false,
  };
};

export function dispatch(db: AppDatabase, request: DispatchRequest): DispatchOutcome {
  const outcome = db.transaction((tx) => run(tx, request));
  if (outcome.ok && !outcome.repeated) {
    broadcastDocument(
      request.combatId,
      outcome.document,
      undefined,
      lastActionsOf(db, request.combatId),
    );
  }
  return outcome;
}
