import type { Combat, Condition, HpHistoryEntry, Preset, Tag, Unit } from '@combat-planner/domain';
import { LIMITS } from '@combat-planner/domain';
import { scenario } from '../../api/scenarios.ts';
import type { Scenario } from '../../api/scenarios.ts';

const pad = (value: number): string => String(value).padStart(22, '0');

export const COMBAT_ID = `01JC${pad(1)}`;
export const MISSING_COMBAT_ID = `01JC${pad(2)}`;
export const COMBAT_TITLE = 'Ambush at the Ferry';
export const JONAS = `01JD${pad(1)}`;
export const MIKA = `01JD${pad(2)}`;
export const STORY_ORIGIN = 'https://combat-planner.example';

const createdAt = '2026-10-15T18:00:00.000Z';

const players = { [JONAS]: 'Jonas', [MIKA]: 'Mika' };

export interface UnitSeed {
  name: string;
  role: Unit['role'];
  initiative: number | null;
  initiativeBonus?: number;
  hp: number;
  maxHp: number;
  tempHp?: number;
  defenses: [number, number, number];
  conditions?: Condition[];
  claimedBy?: string;
  disabled?: boolean;
  note?: string;
  hpHistory?: HpHistoryEntry[];
}

const historyEntry = (amount: number, previous: number, round: number): HpHistoryEntry => ({
  kind: 'damage',
  amount,
  absorbed: 0,
  previous,
  result: previous - amount,
  round,
  at: createdAt,
});

export const roster = {
  aldric: {
    name: 'Ser Aldric',
    role: 'hero',
    initiative: 19,
    hp: 52,
    maxHp: 52,
    defenses: [21, 17, 15],
    claimedBy: JONAS,
  },
  orc: {
    name: 'Orc Berserker',
    role: 'enemy',
    initiative: 17,
    hp: 14,
    maxHp: 40,
    defenses: [18, 16, 12],
    conditions: ['staggered'],
  },
  vashti: {
    name: 'Vashti the Hexer',
    role: 'hero',
    initiative: 15,
    initiativeBonus: 3,
    hp: 20,
    maxHp: 36,
    defenses: [16, 14, 19],
    conditions: ['dazed'],
    claimedBy: MIKA,
    hpHistory: [historyEntry(9, 36, 2), historyEntry(7, 27, 3)],
  },
  goblin: {
    name: 'Goblin Archer 1',
    role: 'enemy',
    initiative: 12,
    hp: -3,
    maxHp: 18,
    defenses: [16, 14, 12],
  },
  tomas: {
    name: 'Brother Tomas of the Silver Lantern Order',
    role: 'ally',
    initiative: 9,
    hp: 30,
    maxHp: 30,
    tempHp: 5,
    defenses: [19, 15, 17],
  },
  shadow: {
    name: '影の射手ゴブリン',
    role: 'enemy',
    initiative: 7,
    hp: 18,
    maxHp: 18,
    defenses: [16, 14, 12],
    conditions: ['stuck'],
    disabled: true,
  },
} as const satisfies Record<string, UnitSeed>;

export type RosterKey = keyof typeof roster;

const rosterKeys = Object.keys(roster) as RosterKey[];

export const unitIds: Record<RosterKey, string> = Object.fromEntries(
  rosterKeys.map((key, index) => [key, `01JE${pad(index + 1)}`]),
) as Record<RosterKey, string>;

export const unitOf = (id: string, seed: UnitSeed): Unit => {
  const [ac, pd, md] = seed.defenses;
  return {
    id,
    name: seed.name,
    role: seed.role,
    initiativeBonus: seed.initiativeBonus ?? 0,
    initiative: seed.initiative,
    maxHp: seed.maxHp,
    hp: seed.hp,
    tempHp: seed.tempHp ?? 0,
    ac,
    pd,
    md,
    note: seed.note ?? '',
    conditions: [...(seed.conditions ?? [])],
    disabled: seed.disabled ?? false,
    claimedBy: seed.claimedBy ?? null,
    hpHistory: [...(seed.hpHistory ?? [])],
  };
};

export type UnitPatch = Partial<Record<RosterKey, Partial<Unit>>>;

export const rosterUnits = (patch: UnitPatch = {}): Unit[] =>
  rosterKeys.map((key) => ({ ...unitOf(unitIds[key], roster[key]), ...patch[key] }));

export interface CombatSeed {
  status?: Combat['status'];
  round?: number;
  escalation?: number;
  active?: RosterKey | null;
  units?: Unit[];
}

export const combatOf = ({
  status = 'active',
  round = 3,
  escalation = 2,
  active = 'vashti',
  units = rosterUnits(),
}: CombatSeed = {}): Combat => ({
  id: COMBAT_ID,
  title: COMBAT_TITLE,
  description: '',
  color: 0,
  status,
  round: status === 'setup' ? LIMITS.round.min : round,
  escalation: status === 'setup' ? LIMITS.escalation.min : escalation,
  activeUnitId: status === 'setup' || active === null ? null : unitIds[active],
  lastPlayedAt: createdAt,
  linkGeneration: 0,
  version: 1,
  players,
  createdAt,
  updatedAt: createdAt,
  units,
});

export const setupUnits = (): Unit[] =>
  rosterUnits().map((unit) => ({
    ...unit,
    initiative: unit.id === unitIds.tomas ? unit.initiative : null,
    hp: unit.maxHp,
    tempHp: 0,
    conditions: [],
    disabled: false,
    hpHistory: [],
  }));

const longSeeds: readonly UnitSeed[] = [
  {
    name: 'Flussbrückenwächterin Adelheid von Stein',
    role: 'ally',
    initiative: 11,
    hp: 24,
    maxHp: 32,
    defenses: [18, 15, 14],
  },
  {
    name: 'Guardiana del vado Esperanza de la Luz',
    role: 'ally',
    initiative: 11,
    hp: 32,
    maxHp: 32,
    defenses: [17, 15, 14],
  },
  {
    name: 'Капитан стражи переправы Святослав Огнев',
    role: 'ally',
    initiative: 10,
    hp: 40,
    maxHp: 40,
    defenses: [19, 16, 13],
  },
  {
    name: 'Goblin Archer 3',
    role: 'enemy',
    initiative: 10,
    hp: 18,
    maxHp: 18,
    defenses: [16, 14, 12],
  },
  roster.tomas,
  {
    name: 'Sœur Éléonore de la Lanterne d’Argent',
    role: 'ally',
    initiative: 8,
    hp: 11,
    maxHp: 28,
    defenses: [17, 13, 18],
    conditions: ['weakened', 'vulnerable'],
  },
  { name: 'Orc Shaman', role: 'enemy', initiative: 8, hp: 0, maxHp: 30, defenses: [17, 15, 16] },
  roster.shadow,
  {
    name: '黒水の渡し守と呪われし大蛇の群れ',
    role: 'enemy',
    initiative: 6,
    hp: 61,
    maxHp: 80,
    defenses: [20, 18, 14],
  },
];

const longId = (index: number): string => `01JF${pad(index + 1)}`;

const fillerOf = (index: number): Unit =>
  unitOf(longId(longSeeds.length + index), {
    name: `Goblin Archer ${index + 4}`,
    role: 'enemy',
    initiative: 5,
    hp: 18,
    maxHp: 18,
    defenses: [16, 14, 12],
  });

export const longUnits = (count: number = longSeeds.length): Unit[] => [
  ...longSeeds.map((seed, index) => unitOf(longId(index), seed)),
  ...Array.from({ length: Math.max(0, count - longSeeds.length) }, (_, index) => fillerOf(index)),
];

const tagIds = {
  orcs: `01JG${pad(1)}`,
  goblins: `01JG${pad(2)}`,
  allies: `01JG${pad(3)}`,
} as const;

export const libraryTags: Tag[] = [
  { id: tagIds.orcs, name: 'Orcs' },
  { id: tagIds.goblins, name: 'Goblins' },
  { id: tagIds.allies, name: 'Allies' },
];

const presetOf = (
  index: number,
  name: string,
  role: Preset['role'],
  [maxHp, ac, pd, md]: [number, number, number, number],
  tags: string[],
): Preset => ({
  id: `01JH${pad(index)}`,
  name,
  role,
  maxHp,
  ac,
  pd,
  md,
  initiativeBonus: 0,
  tags,
  createdAt,
  updatedAt: createdAt,
});

export const libraryPresets: Preset[] = [
  presetOf(1, 'Orc Berserker', 'enemy', [40, 18, 16, 12], [tagIds.orcs]),
  presetOf(2, 'Orc Shaman', 'enemy', [30, 17, 15, 16], [tagIds.orcs]),
  presetOf(3, 'Goblin Archer', 'enemy', [18, 16, 14, 12], [tagIds.goblins]),
  presetOf(
    4,
    'Brother Tomas of the Silver Lantern Order',
    'ally',
    [30, 19, 15, 17],
    [tagIds.allies],
  ),
];

export const combatScenario = (combat: Combat): Scenario =>
  scenario({ combats: [combat], presets: libraryPresets, tags: libraryTags });

export const runningScenario = (seed: CombatSeed = {}): Scenario => combatScenario(combatOf(seed));

export const setupScenario = (): Scenario =>
  combatScenario(combatOf({ status: 'setup', units: setupUnits() }));

export const noUnitsScenario = (): Scenario =>
  combatScenario(combatOf({ status: 'setup', units: [] }));

export const longScenario = (count?: number): Scenario =>
  combatScenario(combatOf({ active: null, units: longUnits(count) }));

export const rolls = (values: readonly number[]): (() => number) => {
  let index = 0;
  return () => {
    const roll = values[index % values.length] ?? LIMITS.roll.min;
    index += 1;
    return (roll - LIMITS.roll.min + 0.5) / (LIMITS.roll.max - LIMITS.roll.min + 1);
  };
};
