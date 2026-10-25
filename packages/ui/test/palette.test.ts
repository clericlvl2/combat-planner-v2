import { describe, expect, it } from 'vite-plus/test';
import { contrast, fromOklch, lighten, linearRgb, mix, oklab, on, tint } from '../src/color.ts';
import {
  base,
  combatColors,
  conditionHues,
  conditionNames,
  conditions,
  health,
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
      accent: seeds.brass,
      onAccent: onPaper(seeds.brass),
      border: step('border'),
      disabled: step('disabled'),
      ink: seeds.ink,
      inkPressed: lighten(seeds.ink, 8),
      secondary: lighten(seeds.ink, 22),
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
    });
    expect(health).toEqual({
      full: seeds.full,
      wounded: seeds.wounded,
      staggered: seeds.staggered,
      unconscious: seeds.unconscious,
      dead: lighten(seeds.ink, 19, -0.02),
    });
    expect(healthTints).toEqual({
      full: tint(seeds.full, 92, 0.05),
      wounded: tint(seeds.wounded, 92, 0.05),
      staggered: tint(seeds.staggered, 92, 0.05),
      unconscious: tint(seeds.unconscious, 92, 0.05),
    });
    expect(hpActions).toEqual({
      damage: seeds.enemy,
      heal: lighten(seeds.full, -8),
      setTemp: seeds.hero,
      max: seeds.max,
      on: onPaper(seeds.enemy),
      dangerSoft: tint(seeds.enemy, 93, 0.03),
    });
    expect(interaction).toEqual({
      focus: seeds.hero,
      tapMarker: seeds.brass,
      dangerPressed: lighten(seeds.enemy, -8),
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
          ? { fill: tint(seeds.paper, 90, 0.013), text: tint(seeds.paper, 38, 0.016) }
          : {
              fill: fromOklch({ l: 0.9, c: 0.05, h: hue }),
              text: fromOklch({ l: 0.38, c: 0.07, h: hue }),
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
  ...(['full', 'wounded', 'staggered', 'unconscious'] as const).map(
    (status): [string, string, string] => [
      `${status} pip on its tint`,
      health[status],
      healthTints[status],
    ],
  ),
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
  ['full and wounded, pip count as the second channel', health.full, health.wounded, 0.05],
  [
    'wounded and staggered, pip count as the second channel',
    health.wounded,
    health.staggered,
    0.05,
  ],
  ['full and staggered, pip count as the second channel', health.full, health.staggered, 0.05],
];

describe('palette colour-vision separation', () => {
  it.each(separatedPairs)('%s stay apart', (_name, a, b, threshold) => {
    expect(deltaE(a, b, 'deuteranopia')).toBeGreaterThanOrEqual(threshold);
    expect(deltaE(a, b, 'protanopia')).toBeGreaterThanOrEqual(threshold);
  });
});
