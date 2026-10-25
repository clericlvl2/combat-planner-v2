import { describe, expect, it } from 'vite-plus/test';
import {
  apcaLc,
  contrast,
  fromOklch,
  lighten,
  linearRgb,
  mix,
  oklab,
  on,
  tint,
} from '../src/color.ts';
import {
  base,
  combatColors,
  conditionHues,
  conditionNames,
  conditions,
  health,
  healthText,
  healthTints,
  historyTemp,
  hpActions,
  interaction,
  paletteVariables,
  paperSteps,
  roles,
  seeds,
} from '../src/theme.ts';

const simulations = {
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
} as const;

type Simulation = keyof typeof simulations;

function simulate(hex: string, kind: Simulation): number[] {
  const rgb = linearRgb(hex);
  return simulations[kind].map((row) =>
    Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])),
  );
}

function deltaE(a: string, b: string, kind: Simulation): number {
  const [l1, a1, b1] = oklab(simulate(a, kind));
  const [l2, a2, b2] = oklab(simulate(b, kind));
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

const onPaper = (fill: string) => on(fill, seeds.ink, seeds.paper);
const step = (name: keyof typeof paperSteps) =>
  lighten(seeds.paper, paperSteps[name].l, paperSteps[name].c);

describe('palette derivation', () => {
  it('derives every base token from its seed', () => {
    expect(base).toEqual({
      background: step('background'),
      field: step('field'),
      surface: seeds.paper,
      soft: step('soft'),
      highlight: mix(seeds.brass, seeds.paper, 25),
      accent: lighten(seeds.brass, 10),
      onAccent: onPaper(lighten(seeds.brass, 10)),
      border: step('border'),
      disabled: step('disabled'),
      ink: seeds.ink,
      inkPressed: lighten(seeds.ink, 8),
      secondary: lighten(seeds.ink, 12),
      muted: lighten(seeds.ink, 36),
      chrome: seeds.moss,
      onChrome: onPaper(seeds.moss),
      primary: seeds.moss,
      onPrimary: onPaper(seeds.moss),
      primaryPressed: lighten(seeds.moss, 7),
      primaryDeep: lighten(seeds.moss, -10, -0.01),
    });
  });

  it('derives every role, health and action token from its seed', () => {
    expect(roles).toEqual({
      hero: seeds.hero,
      enemy: seeds.enemy,
      ally: seeds.ally,
      inactive: lighten(seeds.ink, 26),
      on: onPaper(seeds.hero),
      heroText: lighten(seeds.hero, -12),
    });
    expect(health).toEqual({
      full: seeds.full,
      staggered: seeds.staggered,
      unconscious: seeds.unconscious,
      dead: lighten(seeds.ink, 19, -0.02),
    });
    expect(healthTints).toEqual({
      full: tint(seeds.full, 92, 0.05),
      staggered: tint(seeds.staggered, 92, 0.05),
    });
    expect(healthText).toEqual({
      full: lighten(seeds.full, -6),
    });
    expect(hpActions).toEqual({
      damage: seeds.enemy,
      heal: lighten(seeds.full, -8),
      healText: lighten(seeds.full, -20),
      setTemp: seeds.hero,
      max: seeds.max,
      on: onPaper(seeds.enemy),
      dangerSoft: tint(seeds.enemy, 93, 0.03),
    });
    expect(interaction).toEqual({
      focus: seeds.hero,
      dangerPressed: lighten(seeds.enemy, -8),
      dangerText: lighten(seeds.enemy, -20),
    });
    expect(historyTemp).toEqual({ text: lighten(seeds.hero, -5, -0.03) });
    expect(combatColors).toEqual([
      seeds.enemy,
      seeds.max,
      seeds.wounded,
      seeds.full,
      seeds.ally,
      seeds.hero,
      base.secondary,
      base.muted,
    ]);
  });

  it('derives every condition from its hue', () => {
    for (const name of conditionNames) {
      const hue = conditionHues[name];
      expect(conditions[name]).toEqual(
        hue === null
          ? { fill: tint(seeds.paper, 94, 0.013), text: tint(seeds.paper, 30, 0.016) }
          : {
              fill: fromOklch({ l: 0.94, c: 0.05, h: hue }),
              text: fromOklch({ l: 0.3, c: 0.07, h: hue }),
            },
      );
    }
  });

  it('keeps every seed distinct and every variable off pure white', () => {
    const values = Object.values(seeds);
    expect(new Set(values).size).toBe(values.length);
    expect(Object.values(paletteVariables())).not.toContain('#FFFFFF');
  });
});

const textPairs: [string, string, string][] = [
  ...(['surface', 'background', 'field', 'soft'] as const).flatMap(
    (fill): [string, string, string][] => [
      [`ink on ${fill}`, base.ink, base[fill]],
      [`secondary on ${fill}`, base.secondary, base[fill]],
    ],
  ),
  ['onChrome on chrome', base.onChrome, base.chrome],
  ['onPrimary on primary', base.onPrimary, base.primary],
  ['onAccent on accent', base.onAccent, base.accent],
  ...(['hero', 'enemy', 'ally', 'inactive'] as const).map((role): [string, string, string] => [
    `role on ${role}`,
    roles.on,
    roles[role],
  ]),
  ...(['damage', 'heal', 'setTemp', 'max'] as const).map((action): [string, string, string] => [
    `hp on ${action}`,
    hpActions.on,
    hpActions[action],
  ]),
  ...conditionNames.map((name): [string, string, string] => [
    `${name} text on its fill`,
    conditions[name].text,
    conditions[name].fill,
  ]),
  ['heal as text on surface', hpActions.heal, base.surface],
  ['damage as text on surface', hpActions.damage, base.surface],
];

const graphicPairs: [string, string, string][] = [
  ...(['full', 'staggered'] as const).map((status): [string, string, string] => [
    `${status} pip on its tint`,
    health[status],
    healthTints[status],
  ]),
  ['dead on soft', health.dead, base.soft],
  ...(['hero', 'enemy', 'ally'] as const).map((role): [string, string, string] => [
    `${role} on surface`,
    roles[role],
    base.surface,
  ]),
];

describe('palette contrast', () => {
  it.each(textPairs)('%s reads as text', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(graphicPairs)('%s reads as a graphic', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});

const separatedPairs: [string, string, string, number][] = [
  ['hero and enemy', roles.hero, roles.enemy, 0.08],
  ['hero and ally', roles.hero, roles.ally, 0.08],
  ['enemy and ally', roles.enemy, roles.ally, 0.08],
  ['staggered and unconscious', health.staggered, health.unconscious, 0.08],
  ['full and staggered, pip count as the second channel', health.full, health.staggered, 0.05],
  ['full and an empty segment, pip count as the second channel', health.full, base.border, 0.05],
  [
    'staggered and an empty segment, pip count as the second channel',
    health.staggered,
    base.border,
    0.05,
  ],
];

describe('palette colour-vision separation', () => {
  it.each(separatedPairs)('%s stay apart', (_name, a, b, threshold) => {
    expect(deltaE(a, b, 'deuteranopia')).toBeGreaterThanOrEqual(threshold);
    expect(deltaE(a, b, 'protanopia')).toBeGreaterThanOrEqual(threshold);
  });
});

const apcaReferences: [string, string, number][] = [
  ['#000000', '#FFFFFF', 106.04],
  ['#FFFFFF', '#000000', -107.88],
  ['#888888', '#FFFFFF', 63.06],
];

const paper = ['surface', 'background', 'field', 'soft', 'highlight'] as const;

const apcaPairs: [string, string, string, number][] = [
  ...paper.map((fill): [string, string, string, number] => [
    `ink text on ${fill}`,
    base.ink,
    base[fill],
    75,
  ]),
  ...(['surface', 'background', 'soft', 'highlight'] as const).map(
    (fill): [string, string, string, number] => [
      `secondary text on ${fill}`,
      base.secondary,
      base[fill],
      75,
    ],
  ),
  ['onChrome text on chrome', base.onChrome, base.chrome, 75],
  ['onPrimary text on primary', base.onPrimary, base.primary, 75],
  ['TurnBar secondary line on pressed primary', base.onPrimary, base.primaryPressed, 75],
  ['onAccent text on the brass fill', base.onAccent, base.accent, 75],
  ...(['hero', 'enemy', 'ally', 'inactive'] as const).map(
    (role): [string, string, string, number] => [`role text on ${role}`, roles.on, roles[role], 75],
  ),
  ...(['damage', 'heal', 'setTemp', 'max'] as const).map(
    (action): [string, string, string, number] => [
      `hp text on ${action}`,
      hpActions.on,
      hpActions[action],
      75,
    ],
  ),
  ...conditionNames.map((name): [string, string, string, number] => [
    `${name} chip text on its fill`,
    conditions[name].text,
    conditions[name].fill,
    85,
  ]),
  ...(['surface', 'background', 'soft'] as const).map((fill): [string, string, string, number] => [
    `danger text on ${fill}`,
    interaction.dangerText,
    base[fill],
    75,
  ]),
  ['danger text on dangerSoft', interaction.dangerText, hpActions.dangerSoft, 75],
  ['heal text on surface', hpActions.healText, base.surface, 75],
  ...(['surface', 'highlight'] as const).map((fill): [string, string, string, number] => [
    `hero text on ${fill}`,
    roles.heroText,
    base[fill],
    75,
  ]),
  ['full after number on soft, display 22/700', healthText.full, base.soft, 60],
  ['staggered after number on soft, display 22/700', health.staggered, base.soft, 60],
  ['0 HP or below after number on soft, display 22/700', base.secondary, base.soft, 60],
  ['toast action on ink', base.highlight, base.ink, 75],
  ['toast action on pressed ink', base.highlight, base.inkPressed, 75],
  ...(['full', 'staggered'] as const).map((status): [string, string, string, number] => [
    `${status} segment on its tint`,
    health[status],
    healthTints[status],
    45,
  ]),
  ...paper.map((fill): [string, string, string, number] => [
    `focus ring on ${fill}`,
    interaction.focus,
    base[fill],
    45,
  ]),
  ['focus ring on chrome', base.onChrome, base.chrome, 45],
  ['focus ring on the brass fill', base.ink, base.accent, 45],
  ['focus ring on ink', base.surface, base.ink, 45],
  ['focus ring on primary', base.onPrimary, base.primary, 45],
  ...(['damage', 'heal', 'setTemp', 'max'] as const).map(
    (action): [string, string, string, number] => [
      `focus ring on ${action}`,
      hpActions.on,
      hpActions[action],
      45,
    ],
  ),
  ...conditionNames.map((name): [string, string, string, number] => [
    `focus ring on the ${name} chip`,
    conditions[name].text,
    conditions[name].fill,
    45,
  ]),
  ...(['hero', 'enemy', 'ally', 'inactive'] as const).map(
    (role): [string, string, string, number] => [
      `focus ring inside ${role}`,
      roles.on,
      roles[role],
      45,
    ],
  ),
  ['field border on surface', base.border, base.surface, 45],
  ['empty segment on surface', base.border, base.surface, 30],
  ['empty segment on soft', base.border, base.soft, 30],
  ['divider on background', base.border, base.background, 15],
  ['divider on field', base.border, base.field, 15],
  ['header divider on chrome', mix(base.onChrome, base.chrome, 25), base.chrome, 15],
];

describe('palette APCA contrast', () => {
  it.each(apcaReferences)('Lc of %s on %s is %d', (text, background, lc) => {
    expect(apcaLc(text, background)).toBeCloseTo(lc, 2);
  });

  it.each(apcaPairs)('%s reaches the required Lc', (_name, text, background, required) => {
    expect(Math.abs(apcaLc(text, background))).toBeGreaterThanOrEqual(required);
  });
});
