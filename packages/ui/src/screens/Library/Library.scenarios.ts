import type { Preset, Role, Tag } from '@combat-planner/domain';
import { LIMITS } from '@combat-planner/domain';
import { DM_ACCOUNT, scenario } from '../../api/scenarios.ts';
import type { Scenario } from '../../api/scenarios.ts';

const storyNow = new Date(2026, 9, 15, 12, 0).getTime();

const hourMs = 60 * 60 * 1000;

const pad = (value: number, length: number): string => String(value).padStart(length, '0');

const presetId = (index: number): string => `01JC${pad(index, 22)}`;

const tagId = (index: number): string => `01JD${pad(index, 22)}`;

const tagNames = [
  'Orcs',
  'Ferry',
  'Goblins',
  'Mooks',
  'Allies',
  'Named NPCs',
  'Undead',
  'Bosses',
  'Veterans',
] as const;

type TagName = (typeof tagNames)[number];

export const libraryTags: Tag[] = tagNames.map((name, index) => ({ id: tagId(index), name }));

export const tagIdOf = (name: TagName): string => tagId(tagNames.indexOf(name));

export interface PresetSeed {
  name: string;
  role: Role;
  maxHp: number;
  ac: number;
  pd: number;
  md: number;
  initiativeBonus?: number;
  tags: readonly TagName[];
}

export const presetOf = (index: number, seed: PresetSeed): Preset => {
  const createdAt = new Date(storyNow - (index + 1) * hourMs).toISOString();
  return {
    id: presetId(index),
    name: seed.name,
    role: seed.role,
    maxHp: seed.maxHp,
    ac: seed.ac,
    pd: seed.pd,
    md: seed.md,
    initiativeBonus: seed.initiativeBonus ?? 0,
    tags: seed.tags.map(tagIdOf),
    createdAt,
    updatedAt: createdAt,
  };
};

export const presetSeeds: readonly PresetSeed[] = [
  {
    name: 'Orc Berserker',
    role: 'enemy',
    maxHp: 40,
    ac: 18,
    pd: 16,
    md: 12,
    initiativeBonus: 2,
    tags: ['Orcs', 'Ferry'],
  },
  { name: 'Orc Shaman', role: 'enemy', maxHp: 30, ac: 17, pd: 15, md: 16, tags: ['Orcs'] },
  {
    name: 'Goblin Archer',
    role: 'enemy',
    maxHp: 18,
    ac: 16,
    pd: 14,
    md: 12,
    initiativeBonus: 3,
    tags: ['Goblins', 'Mooks', 'Ferry'],
  },
  {
    name: 'Brother Tomas of the Silver Lantern Order',
    role: 'ally',
    maxHp: 30,
    ac: 19,
    pd: 15,
    md: 17,
    tags: ['Allies', 'Named NPCs'],
  },
  { name: '影の射手ゴブリン', role: 'enemy', maxHp: 18, ac: 16, pd: 14, md: 12, tags: ['Goblins'] },
  {
    name: 'Капитан стражи переправы Святослав Огнев',
    role: 'ally',
    maxHp: 40,
    ac: 19,
    pd: 16,
    md: 13,
    tags: ['Allies', 'Ferry'],
  },
  {
    name: 'Skeletal Ferryman',
    role: 'enemy',
    maxHp: 52,
    ac: 19,
    pd: 17,
    md: 14,
    tags: ['Undead', 'Bosses'],
  },
];

export const libraryPresets: Preset[] = presetSeeds.map((seed, index) => presetOf(index, seed));

const session = {
  userId: DM_ACCOUNT.userId,
  email: 'dm@ferry.games',
  displayName: DM_ACCOUNT.displayName,
  language: DM_ACCOUNT.language,
};

export const libraryScenario: Scenario = scenario({
  session,
  presets: libraryPresets,
  tags: libraryTags,
});

export const emptyLibraryScenario: Scenario = scenario({ session, presets: [], tags: [] });

export const savedFromCombat: Preset = {
  ...presetOf(100, { ...presetSeeds[0]!, tags: [] }),
  createdAt: new Date(storyNow).toISOString(),
  updatedAt: new Date(storyNow).toISOString(),
};

export const fromCombatScenario: Scenario = scenario({
  session,
  presets: [savedFromCombat, ...libraryPresets.slice(1)],
  tags: libraryTags,
});

export const fullLibraryScenario: Scenario = scenario({
  session,
  presets: Array.from({ length: LIMITS.presetsPerDm }, (_, index) =>
    presetOf(index, {
      name: `Goblin ${index + 1}`,
      role: 'enemy',
      maxHp: 10 + (index % 40),
      ac: 12,
      pd: 10,
      md: 10,
      tags: index % 3 === 0 ? ['Mooks'] : [],
    }),
  ),
  tags: libraryTags,
});

export const fullTagsScenario: Scenario = scenario({
  session,
  presets: libraryPresets,
  tags: Array.from(
    { length: LIMITS.tagsPerDm },
    (_, index): Tag => libraryTags[index] ?? { id: tagId(index), name: `Tag ${index + 1}` },
  ),
});
