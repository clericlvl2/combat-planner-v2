import type { Role } from '@combat-planner/domain';
import type { ConditionName } from '../../theme.ts';

export const STAGE_COMBAT_TITLE = 'Ambush at the Ferry';

export const STAGE_TURN_MS = 1700;

export const STAGE_STILL_STEP = 9;

export const STAGE_PLAYER_DELAYS = { mika: 320, jonas: 420 } as const;

export interface StageUnit {
  id: string;
  name: string;
  role: Role;
  initiative: number;
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  pd: number;
  md: number;
  conditions: readonly ConditionName[];
  note?: string;
}

export type StageDeltaKind = 'damage' | 'heal' | 'temp';

export interface StageDelta {
  id: string;
  unit: string;
  kind: StageDeltaKind;
  amount: number;
}

export interface StageState {
  loop: number;
  step: number;
  round: number;
  escalation: number;
  active: number;
  units: readonly StageUnit[];
  deltas: readonly StageDelta[];
}

type StageOp =
  | { op: StageDeltaKind; unit: string; amount: number }
  | { op: 'condition'; unit: string; add?: ConditionName; remove?: ConditionName };

const seedUnits: readonly StageUnit[] = [
  {
    id: 'aldric',
    name: 'Ser Aldric',
    role: 'hero',
    initiative: 19,
    hp: 52,
    maxHp: 52,
    tempHp: 0,
    ac: 21,
    pd: 17,
    md: 15,
    conditions: [],
  },
  {
    id: 'orc',
    name: 'Orc Berserker',
    role: 'enemy',
    initiative: 17,
    hp: 40,
    maxHp: 40,
    tempHp: 0,
    ac: 18,
    pd: 16,
    md: 12,
    conditions: [],
  },
  {
    id: 'vashti',
    name: 'Vashti the Hexer',
    role: 'hero',
    initiative: 15,
    hp: 36,
    maxHp: 36,
    tempHp: 0,
    ac: 16,
    pd: 14,
    md: 19,
    conditions: [],
    note: 'Hex on Orc Berserker',
  },
  {
    id: 'goblin1',
    name: 'Goblin Archer 1',
    role: 'enemy',
    initiative: 12,
    hp: 18,
    maxHp: 18,
    tempHp: 0,
    ac: 16,
    pd: 14,
    md: 12,
    conditions: [],
  },
  {
    id: 'tomas',
    name: 'Brother Tomas',
    role: 'ally',
    initiative: 9,
    hp: 30,
    maxHp: 30,
    tempHp: 0,
    ac: 19,
    pd: 15,
    md: 17,
    conditions: [],
  },
  {
    id: 'goblin2',
    name: 'Goblin Archer 2',
    role: 'enemy',
    initiative: 7,
    hp: 18,
    maxHp: 18,
    tempHp: 0,
    ac: 16,
    pd: 14,
    md: 12,
    conditions: [],
  },
];

const script: readonly (readonly StageOp[])[] = [
  [{ op: 'damage', unit: 'orc', amount: 12 }],
  [{ op: 'damage', unit: 'aldric', amount: 9 }],
  [
    { op: 'condition', unit: 'orc', add: 'dazed' },
    { op: 'damage', unit: 'orc', amount: 8 },
  ],
  [{ op: 'damage', unit: 'vashti', amount: 7 }],
  [
    { op: 'temp', unit: 'vashti', amount: 5 },
    { op: 'heal', unit: 'aldric', amount: 6 },
  ],
  [{ op: 'damage', unit: 'tomas', amount: 6 }],
  [{ op: 'damage', unit: 'orc', amount: 14 }],
  [
    { op: 'damage', unit: 'vashti', amount: 11 },
    { op: 'condition', unit: 'orc', remove: 'dazed' },
  ],
  [
    { op: 'damage', unit: 'goblin1', amount: 10 },
    { op: 'condition', unit: 'goblin1', add: 'hampered' },
  ],
  [{ op: 'condition', unit: 'tomas', add: 'stuck' }],
  [{ op: 'heal', unit: 'vashti', amount: 8 }],
  [
    { op: 'damage', unit: 'aldric', amount: 5 },
    { op: 'condition', unit: 'aldric', add: 'vulnerable' },
  ],
  [{ op: 'damage', unit: 'orc', amount: 9 }],
  [{ op: 'damage', unit: 'goblin1', amount: 9 }],
  [
    { op: 'condition', unit: 'tomas', remove: 'stuck' },
    { op: 'damage', unit: 'goblin2', amount: 7 },
  ],
  [
    { op: 'damage', unit: 'vashti', amount: 6 },
    { op: 'condition', unit: 'aldric', remove: 'vulnerable' },
  ],
  [{ op: 'damage', unit: 'goblin2', amount: 8 }],
  [{ op: 'condition', unit: 'goblin2', add: 'fear' }],
  [{ op: 'damage', unit: 'goblin2', amount: 6 }],
  [{ op: 'heal', unit: 'tomas', amount: 6 }],
];

export const initialStage = (loop = 0): StageState => ({
  loop,
  step: 0,
  round: 1,
  escalation: 0,
  active: 0,
  units: seedUnits,
  deltas: [],
});

function applyOp(unit: StageUnit, op: StageOp): StageUnit {
  switch (op.op) {
    case 'damage': {
      const absorbed = Math.min(unit.tempHp, op.amount);
      return { ...unit, tempHp: unit.tempHp - absorbed, hp: unit.hp - (op.amount - absorbed) };
    }
    case 'heal':
      return { ...unit, hp: Math.min(unit.maxHp, unit.hp + op.amount) };
    case 'temp':
      return { ...unit, tempHp: op.amount };
    case 'condition': {
      const kept = unit.conditions.filter((condition) => condition !== op.remove);
      const added = op.add && !kept.includes(op.add) ? [...kept, op.add] : kept;
      return { ...unit, conditions: added };
    }
  }
}

const alive = (unit: StageUnit | undefined): boolean => unit !== undefined && unit.hp > 0;

function nextIndex(units: readonly StageUnit[], from: number): { index: number; wrapped: boolean } {
  let index = from;
  let wrapped = false;
  for (let tries = 0; tries < units.length; tries += 1) {
    index = (index + 1) % units.length;
    if (index === 0) wrapped = true;
    if (alive(units[index])) break;
  }
  return { index, wrapped };
}

export function advanceStage(state: StageState): StageState {
  const ops = script[state.step];
  if (!ops) return initialStage(state.loop + 1);
  let units = state.units;
  const deltas: StageDelta[] = [];
  ops.forEach((op, index) => {
    units = units.map((unit) => (unit.id === op.unit ? applyOp(unit, op) : unit));
    if (op.op !== 'condition') {
      deltas.push({
        id: `${state.loop}-${state.step}-${index}`,
        unit: op.unit,
        kind: op.op,
        amount: op.amount,
      });
    }
  });
  const { index, wrapped } = nextIndex(units, state.active);
  return {
    loop: state.loop,
    step: state.step + 1,
    round: wrapped ? state.round + 1 : state.round,
    escalation: wrapped ? Math.min(6, state.escalation + 1) : state.escalation,
    active: index,
    units,
    deltas,
  };
}

export function stageAt(steps: number): StageState {
  let state = initialStage();
  for (let step = 0; step < steps; step += 1) state = advanceStage(state);
  return { ...state, deltas: [] };
}

export function nextUnitName(state: StageState): string {
  return state.units[nextIndex(state.units, state.active).index]?.name ?? '';
}
