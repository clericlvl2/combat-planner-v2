import type { HealthStatus, UnitId } from '@combat-planner/domain';
import { useReducedMotion } from '@mantine/hooks';
import { useState } from 'react';
import { useMotion } from '../provider.tsx';

export type HpChangeKind = 'damage' | 'heal' | 'temp';

export type HpRibbonStatus = Extract<HealthStatus, 'staggered' | 'unconscious' | 'dead'>;

export interface HpChange {
  key: number;
  unitId: UnitId;
  kind?: HpChangeKind;
  amount?: number;
  status?: HpRibbonStatus;
}

export interface HpChangeSource {
  id: UnitId;
  hp?: number;
  tempHp?: number;
  healthStatus: HealthStatus;
}

interface Snapshot {
  hp: number | undefined;
  tempHp: number;
  status: HealthStatus;
}

type Snapshots = ReadonlyMap<UnitId, Snapshot>;

const RIBBON_STATUSES: ReadonlySet<HealthStatus> = new Set(['staggered', 'unconscious', 'dead']);

const isRibbonStatus = (status: HealthStatus): status is HpRibbonStatus =>
  RIBBON_STATUSES.has(status);

const snapshotsOf = (units: readonly HpChangeSource[]): Snapshots =>
  new Map(
    units.map((unit) => [
      unit.id,
      { hp: unit.hp, tempHp: unit.tempHp ?? 0, status: unit.healthStatus },
    ]),
  );

const sameSnapshot = (a: Snapshot, b: Snapshot): boolean =>
  a.hp === b.hp && a.tempHp === b.tempHp && a.status === b.status;

const sameSnapshots = (a: Snapshots, b: Snapshots): boolean => {
  if (a.size !== b.size) return false;
  for (const [id, next] of b) {
    const previous = a.get(id);
    if (!previous || !sameSnapshot(previous, next)) return false;
  }
  return true;
};

const numberOf = (
  previous: Snapshot,
  next: Snapshot,
): Pick<HpChange, 'kind' | 'amount'> | undefined => {
  if (previous.hp === undefined || next.hp === undefined) return undefined;
  const lost = previous.hp + previous.tempHp - (next.hp + next.tempHp);
  if (next.hp < previous.hp || (next.hp === previous.hp && lost > 0)) {
    return { kind: 'damage', amount: lost };
  }
  if (next.hp > previous.hp) {
    const from = previous.status === 'unconscious' ? Math.max(previous.hp, 0) : previous.hp;
    return { kind: 'heal', amount: next.hp - from };
  }
  if (next.tempHp > previous.tempHp) return { kind: 'temp', amount: next.tempHp };
  return undefined;
};

const hpChanges = (previous: Snapshots, next: Snapshots, firstKey: number): HpChange[] => {
  const changes: HpChange[] = [];
  for (const [unitId, after] of next) {
    const before = previous.get(unitId);
    if (!before || sameSnapshot(before, after)) continue;
    const number = numberOf(before, after);
    const status =
      after.status !== before.status && isRibbonStatus(after.status) ? after.status : undefined;
    if (!number && !status) continue;
    changes.push({
      key: firstKey + changes.length,
      unitId,
      ...number,
      ...(status ? { status } : {}),
    });
  }
  return changes;
};

export type HpChanges = ReadonlyMap<UnitId, HpChange>;

export interface HpChangeState {
  snapshots: Snapshots;
  latest: HpChanges;
  nextKey: number;
}

const mergeChanges = (
  latest: HpChanges,
  snapshots: Snapshots,
  changes: readonly HpChange[],
): HpChanges => {
  const merged = new Map([...latest].filter(([unitId]) => snapshots.has(unitId)));
  for (const change of changes) merged.set(change.unitId, change);
  return merged;
};

export const initialHpState = (units: readonly HpChangeSource[]): HpChangeState => ({
  snapshots: snapshotsOf(units),
  latest: new Map(),
  nextKey: 1,
});

export const nextHpState = (
  state: HpChangeState,
  units: readonly HpChangeSource[],
): HpChangeState => {
  const snapshots = snapshotsOf(units);
  if (sameSnapshots(state.snapshots, snapshots)) return state;
  const changes = hpChanges(state.snapshots, snapshots, state.nextKey);
  return {
    snapshots,
    latest: mergeChanges(state.latest, snapshots, changes),
    nextKey: state.nextKey + changes.length,
  };
};

export function useHpChanges(units: readonly HpChangeSource[]): HpChanges {
  const [state, setState] = useState(() => initialHpState(units));
  const next = nextHpState(state, units);
  if (next !== state) setState(next);
  return next.latest;
}

export function useHpMotionReduced(): boolean {
  const motion = useMotion();
  const reduced = useReducedMotion();
  return motion === 'off' || reduced === true;
}
