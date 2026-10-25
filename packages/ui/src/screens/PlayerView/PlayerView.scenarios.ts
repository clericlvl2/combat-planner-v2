import type {
  Action,
  Combat,
  CombatStatus,
  Condition,
  HpHistoryEntry,
  Unit,
} from '@combat-planner/domain';
import { ulid } from 'ulid';
import type { FakeApiClient } from '../../api/FakeApiClient.ts';
import { scenario } from '../../api/scenarios.ts';
import type { Scenario } from '../../api/scenarios.ts';

export const COMBAT_ID = '01JP0000000000000000000CMB';
export const TOKEN = `${COMBAT_ID}.0.ferry`;
export const MIKA = '01JP00000000000000000000MK';
export const JONAS = '01JP00000000000000000000JN';
export const ALEX = '01JP00000000000000000000AX';
export const COMBAT_TITLE = 'Ambush at the Ferry';

export const unitIds = {
  aldric: '01JP0000000000000000000001',
  orc: '01JP0000000000000000000002',
  vashti: '01JP0000000000000000000003',
  goblin: '01JP0000000000000000000004',
  tomas: '01JP0000000000000000000005',
  shadow: '01JP0000000000000000000006',
  ilse: '01JP0000000000000000000007',
} as const;

export type UnitKey = keyof typeof unitIds;

export const ME = 'Vashti the Hexer';

const createdAt = '2026-10-15T18:00:00.000Z';

const vashtiHistory: HpHistoryEntry[] = [
  { kind: 'damage', amount: 10, absorbed: 0, previous: 36, result: 26, round: 1, at: createdAt },
  { kind: 'damage', amount: 9, absorbed: 0, previous: 26, result: 17, round: 2, at: createdAt },
  { kind: 'heal', amount: 3, absorbed: 0, previous: 17, result: 20, round: 2, at: createdAt },
];

interface UnitSeed {
  key: UnitKey;
  name: string;
  role: Unit['role'];
  initiative: number;
  initiativeBonus?: number;
  hp: number;
  maxHp: number;
  tempHp?: number;
  conditions?: Condition[];
  claimedBy?: string;
  defenses?: [number, number, number];
  note?: string;
  disabled?: boolean;
  hpHistory?: HpHistoryEntry[];
}

const seeds: readonly UnitSeed[] = [
  {
    key: 'aldric',
    name: 'Ser Aldric',
    role: 'hero',
    initiative: 19,
    hp: 52,
    maxHp: 52,
    claimedBy: JONAS,
    defenses: [18, 14, 12],
  },
  {
    key: 'orc',
    name: 'Orc Berserker',
    role: 'enemy',
    initiative: 17,
    hp: 14,
    maxHp: 40,
    conditions: ['hampered'],
  },
  {
    key: 'vashti',
    name: ME,
    role: 'hero',
    initiative: 15,
    initiativeBonus: 2,
    hp: 20,
    maxHp: 36,
    conditions: ['dazed'],
    claimedBy: MIKA,
    defenses: [16, 12, 15],
    note: 'Hex on Orc Berserker',
    hpHistory: vashtiHistory,
  },
  { key: 'goblin', name: 'Goblin Archer 1', role: 'enemy', initiative: 12, hp: -3, maxHp: 18 },
  {
    key: 'tomas',
    name: 'Brother Tomas of the Silver Lantern Order',
    role: 'ally',
    initiative: 9,
    hp: 24,
    maxHp: 30,
    tempHp: 5,
    defenses: [17, 15, 13],
  },
  {
    key: 'shadow',
    name: '影の射手ゴブリン',
    role: 'enemy',
    initiative: 7,
    hp: 18,
    maxHp: 18,
    conditions: ['stuck'],
    disabled: true,
  },
];

const ilseSeed: UnitSeed = {
  key: 'ilse',
  name: 'Ilse the Bold',
  role: 'hero',
  initiative: 11,
  initiativeBonus: 1,
  hp: 30,
  maxHp: 30,
  defenses: [15, 13, 12],
};

const unitOf = (seed: UnitSeed): Unit => {
  const [ac, pd, md] = seed.defenses ?? [12, 10, 10];
  return {
    id: unitIds[seed.key],
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
    acMod: 0,
    pdMod: 0,
    mdMod: 0,
    note: seed.note ?? '',
    conditions: seed.conditions ?? [],
    disabled: seed.disabled ?? false,
    claimedBy: seed.claimedBy ?? null,
    hpHistory: seed.hpHistory ?? [],
  };
};

const setupUnit = (unit: Unit): Unit => ({
  ...unit,
  hp: unit.maxHp,
  tempHp: 0,
  conditions: [],
  note: '',
  disabled: false,
  hpHistory: [],
  initiative: unit.id === unitIds.vashti || unit.id === unitIds.ilse ? null : unit.initiative,
});

export interface FerryOptions {
  status?: CombatStatus;
  active?: UnitKey;
  joined?: boolean;
  ilse?: boolean;
  vashtiInitiative?: number | null;
  vashtiHp?: number;
  names?: Partial<Record<UnitKey, string>>;
}

export function ferryCombat({
  status = 'active',
  active = 'orc',
  joined = true,
  ilse = false,
  vashtiInitiative,
  vashtiHp,
  names = {},
}: FerryOptions = {}): Combat {
  const all = ilse ? [...seeds, ilseSeed] : seeds;
  const units = all
    .map((seed) => unitOf({ ...seed, name: names[seed.key] ?? seed.name }))
    .map((unit) => (status === 'setup' ? setupUnit(unit) : unit))
    .map((unit) => {
      if (unit.id !== unitIds.vashti) return unit;
      const claimed = { ...unit, claimedBy: joined ? MIKA : null };
      const withInitiative =
        vashtiInitiative === undefined ? claimed : { ...claimed, initiative: vashtiInitiative };
      return vashtiHp === undefined ? withInitiative : { ...withInitiative, hp: vashtiHp };
    });
  const players: Record<string, string> = joined
    ? { [JONAS]: 'Jonas', [MIKA]: 'Mika' }
    : {
        [JONAS]: 'Jonas',
      };
  const setup = status === 'setup';
  return {
    id: COMBAT_ID,
    title: COMBAT_TITLE,
    description: '',
    color: 0,
    status,
    round: setup ? 1 : 3,
    escalation: setup ? 0 : 2,
    activeUnitId: setup ? null : unitIds[active],
    lastPlayedAt: createdAt,
    linkGeneration: 0,
    version: 1,
    players,
    createdAt,
    updatedAt: createdAt,
    units,
  };
}

export const playerScenario = (combat: Combat, overrides: Partial<Scenario> = {}): Scenario =>
  scenario({ combats: [combat], links: { [combat.id]: TOKEN }, playerId: MIKA, ...overrides });

type ActionBody<A extends Action = Action> = A extends Action ? Omit<A, 'id' | 'version'> : never;

export async function actAsDm(api: FakeApiClient, body: ActionBody): Promise<void> {
  const { version } = await api.combats.get(COMBAT_ID);
  await api.combats.dispatch(COMBAT_ID, { ...body, id: ulid(), version } as Action);
}

export async function claimAs(
  api: FakeApiClient,
  playerId: string,
  displayName: string,
  unitId: string,
): Promise<void> {
  const play = api.playAs(playerId);
  const { combat } = await play.get(TOKEN);
  await play.dispatch(TOKEN, {
    id: ulid(),
    version: combat.version,
    type: 'claimUnit',
    unitId,
    displayName,
  });
}

export async function releaseAs(
  api: FakeApiClient,
  playerId: string,
  unitId: string,
): Promise<void> {
  const play = api.playAs(playerId);
  const { combat } = await play.get(TOKEN);
  await play.dispatch(TOKEN, { id: ulid(), version: combat.version, type: 'releaseUnit', unitId });
}
