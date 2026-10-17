import type { Combat, CombatStatus, Unit } from '@combat-planner/domain';
import { LIMITS } from '@combat-planner/domain';
import { DM_ACCOUNT, scenario } from '../../api/scenarios.ts';
import type { Scenario } from '../../api/scenarios.ts';
import type { CombatColor } from '../../atoms/Swatch/Swatch.tsx';

export const storyNow = new Date(2026, 9, 15, 12, 0).getTime();

const dayMs = 24 * 60 * 60 * 1000;

const daysBefore = (days: number): string => new Date(storyNow - days * dayMs).toISOString();

const pad = (value: number, length: number): string => String(value).padStart(length, '0');

const combatId = (index: number): string => `01JA${pad(index, 22)}`;

const unitId = (combat: number, index: number): string => `01JB${pad(combat, 4)}${pad(index, 18)}`;

const unitOf = (combat: number, index: number): Unit => ({
  id: unitId(combat, index),
  name: `Goblin ${index + 1}`,
  role: 'enemy',
  initiativeBonus: 0,
  initiative: null,
  maxHp: 10,
  hp: 10,
  tempHp: 0,
  ac: 12,
  pd: 10,
  md: 10,
  note: '',
  conditions: [],
  disabled: false,
  claimedBy: null,
  hpHistory: [],
});

export interface CombatSeed {
  title: string;
  description?: string;
  color: CombatColor;
  status?: CombatStatus;
  round?: number;
  units: number;
  playedDaysAgo?: number | null;
}

export const combatOf = (index: number, seed: CombatSeed): Combat => {
  const createdAt = new Date(storyNow - (index + 30) * dayMs).toISOString();
  return {
    id: combatId(index),
    title: seed.title,
    description: seed.description ?? '',
    color: seed.color,
    status: seed.status ?? 'setup',
    round: seed.round ?? LIMITS.round.min,
    escalation: LIMITS.escalation.min,
    activeUnitId: null,
    lastPlayedAt:
      seed.playedDaysAgo === undefined || seed.playedDaysAgo === null
        ? null
        : daysBefore(seed.playedDaysAgo),
    linkGeneration: 0,
    version: 1,
    players: {},
    createdAt,
    updatedAt: createdAt,
    units: Array.from({ length: seed.units }, (_, unit) => unitOf(index, unit)),
  };
};

export const combatSeeds: readonly CombatSeed[] = [
  {
    title: 'Ambush at the Ferry',
    description: 'Session 12. Goblins hold the crossing, the orc waits on the raft.',
    color: 0,
    status: 'active',
    round: 3,
    units: 6,
    playedDaysAgo: 1,
  },
  { title: 'The Drowned Chapel', color: 5, units: 4, playedDaysAgo: 3 },
  {
    title: 'Капитан стражи переправы: засада у моста',
    description: 'Одноразовая встреча для новых игроков. Ferry crossing.',
    color: 3,
    units: 9,
    playedDaysAgo: null,
  },
  {
    title: 'Lich King’s Antechamber',
    color: 6,
    status: 'active',
    round: 7,
    units: 11,
    playedDaysAgo: 0,
  },
  {
    title: '黒水の渡し守',
    description: 'The ferryman of Black Water.',
    color: 4,
    units: 2,
    playedDaysAgo: 14,
  },
  { title: 'Bandits on the Old Road', color: 1, units: 0, playedDaysAgo: null },
];

export const listCombats: Combat[] = combatSeeds.map((seed, index) => combatOf(index, seed));

const session = {
  userId: DM_ACCOUNT.userId,
  email: 'dm@ferry.games',
  displayName: DM_ACCOUNT.displayName,
  language: DM_ACCOUNT.language,
};

export const listScenario: Scenario = scenario({ session, combats: listCombats });

export const noCombatsScenario: Scenario = scenario({ session, combats: [] });

export const fullScenario: Scenario = scenario({
  session,
  combats: Array.from({ length: LIMITS.combatsPerDm }, (_, index) =>
    combatOf(index, {
      title: `Encounter ${index + 1}`,
      color: (index % (LIMITS.color.max + 1)) as CombatColor,
      units: index % 7,
    }),
  ),
});
