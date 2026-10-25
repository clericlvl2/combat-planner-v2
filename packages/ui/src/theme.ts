import '@fontsource/unbounded/600.css';
import '@fontsource/unbounded/700.css';
import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/600.css';
import '@fontsource/rubik/700.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/700.css';
import { colorsTuple, createTheme } from '@mantine/core';
import type { CSSVariablesResolver, MantineThemeOverride } from '@mantine/core';
import { fromOklch, lighten, mix, on, tint } from './color.ts';
import { layout } from './layout.ts';
import classes from './theme.module.css';

export const seeds = {
  paper: '#F9F4EC',
  ink: '#302017',
  moss: '#3D4E2B',
  brass: '#EFA831',
  hero: '#1E59CD',
  enemy: '#C50710',
  ally: '#007570',
  full: '#009157',
  wounded: '#938010',
  staggered: '#AF2D18',
  unconscious: '#7D3AB7',
  max: '#785300',
} as const;

export const conditionNames = [
  'charmed',
  'confused',
  'dazed',
  'fear',
  'helpless',
  'hampered',
  'shocked',
  'stuck',
  'stunned',
  'vulnerable',
  'weakened',
] as const;

export type ConditionName = (typeof conditionNames)[number];

export const conditionHues: Record<ConditionName, number | null> = {
  charmed: 349,
  confused: 135,
  dazed: 95,
  fear: null,
  helpless: 35,
  hampered: 230,
  shocked: 197,
  stuck: 76,
  stunned: 49,
  vulnerable: 17,
  weakened: 110,
};

export const paperSteps = {
  soft: { l: -4, c: 0.008 },
  background: { l: -6, c: 0.008 },
  field: { l: -9, c: 0.013 },
  disabled: { l: -12, c: 0.007 },
  border: { l: -32, c: 0.018 },
} as const;

export const conditionTone = {
  fill: { l: 94, c: 0.05, neutralC: 0.013 },
  text: { l: 30, c: 0.07, neutralC: 0.016 },
} as const;

const onPaper = (fill: string) => on(fill, seeds.ink, seeds.paper);

const brassFill = lighten(seeds.brass, 10);

const paperStep = (step: keyof typeof paperSteps) =>
  lighten(seeds.paper, paperSteps[step].l, paperSteps[step].c);

export const base = {
  background: paperStep('background'),
  field: paperStep('field'),
  surface: seeds.paper,
  soft: paperStep('soft'),
  highlight: mix(seeds.brass, seeds.paper, 25),
  accent: brassFill,
  onAccent: onPaper(brassFill),
  border: paperStep('border'),
  disabled: paperStep('disabled'),
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
};

export const roles = {
  hero: seeds.hero,
  enemy: seeds.enemy,
  ally: seeds.ally,
  inactive: lighten(seeds.ink, 26),
  on: onPaper(seeds.hero),
  heroText: lighten(seeds.hero, -12),
};

export const health = {
  full: seeds.full,
  staggered: seeds.staggered,
  unconscious: seeds.unconscious,
  dead: lighten(seeds.ink, 19, -0.02),
};

export const healthTints = {
  full: tint(seeds.full, 92, 0.05),
  staggered: tint(seeds.staggered, 92, 0.05),
};

export const healthText = {
  full: lighten(seeds.full, -6),
};

export const hpActions = {
  damage: seeds.enemy,
  heal: lighten(seeds.full, -8),
  healText: lighten(seeds.full, -20),
  setTemp: seeds.hero,
  max: seeds.max,
  on: onPaper(seeds.enemy),
  dangerSoft: tint(seeds.enemy, 93, 0.03),
};

export const interaction = {
  focus: seeds.hero,
  dangerPressed: lighten(seeds.enemy, -8),
  dangerText: lighten(seeds.enemy, -20),
};

export const historyTemp = { text: lighten(seeds.hero, -5, -0.03) };

function conditionColor(name: ConditionName, tone: keyof typeof conditionTone): string {
  const hue = conditionHues[name];
  const { l, c, neutralC } = conditionTone[tone];
  return hue === null ? tint(seeds.paper, l, neutralC) : fromOklch({ l: l / 100, c, h: hue });
}

export const conditions = Object.fromEntries(
  conditionNames.map((name) => [
    name,
    { fill: conditionColor(name, 'fill'), text: conditionColor(name, 'text') },
  ]),
) as Record<ConditionName, { fill: string; text: string }>;

export const combatColors = [
  seeds.enemy,
  seeds.max,
  seeds.wounded,
  seeds.full,
  seeds.ally,
  seeds.hero,
  base.secondary,
  base.muted,
] as const;

export const palette = {
  seeds,
  base,
  roles,
  health,
  healthTints,
  healthText,
  hpActions,
  interaction,
  historyTemp,
  conditions,
  combatColors,
} as const;

export const fontFamilies = {
  display: "'Unbounded', 'Noto Sans JP', sans-serif",
  ui: "'Rubik', 'Noto Sans JP', sans-serif",
} as const;

export const fontSizes = {
  capsTile: 7,
  caps: 12,
  micro: 12,
  meta: 12,
  small: 14,
  body: 16,
  number: 18,
  heading: 22,
  title: 28,
  display: 44,
} as const;

export const lineHeights = {
  tight: 1,
  snug: 1.25,
  body: 1.45,
} as const;

export const spacing = [4, 8, 12, 16, 24, 32] as const;

export const radius = {
  segment: 2,
  field: 12,
  tile: 10,
  card: 16,
  sheet: 24,
  full: 9999,
} as const;

export const iconSizes = { S: 16, M: 20, L: 24, XL: 32 } as const;

export const borderWidth = { card: 1, control: 2 } as const;

export const focusRing = { width: 2, color: interaction.focus, offset: 2 } as const;

const scrollShadow = { color: base.ink, alpha: 12 } as const;

const activeShadow = {
  color: base.ink,
  layers: [
    { y: 6, blur: 18, alpha: 16 },
    { y: 1, blur: 3, alpha: 8 },
  ],
} as const;

const shadowLayers = ({ color, layers }: typeof activeShadow) =>
  layers
    .map(
      ({ y, blur, alpha }) =>
        `0 ${y}px ${blur}px color-mix(in srgb, ${color} ${alpha}%, transparent)`,
    )
    .join(', ');

const px = (value: number) => `${value}px`;

const box = ({ top, right, bottom, left }: Record<'top' | 'right' | 'bottom' | 'left', number>) =>
  [top, right, bottom, left].map(px).join(' ');

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function paletteVariables(): Record<string, string> {
  const variables: Record<string, string> = {};
  const groups = {
    color: base,
    role: roles,
    health,
    'health-tint': healthTints,
    'health-text': healthText,
    hp: hpActions,
    'history-temp': historyTemp,
    state: interaction,
  };
  for (const [prefix, group] of Object.entries(groups)) {
    for (const [name, value] of Object.entries(group)) {
      variables[`--cp-${prefix}-${kebab(name)}`] = value;
    }
  }
  for (const name of conditionNames) {
    variables[`--cp-condition-${name}-fill`] = conditions[name].fill;
    variables[`--cp-condition-${name}-text`] = conditions[name].text;
  }
  variables['--cp-color-scrim'] = `color-mix(in srgb, ${base.ink} 50%, transparent)`;
  combatColors.forEach((value, index) => {
    variables[`--cp-combat-${index}`] = value;
  });
  variables['--cp-font-display'] = fontFamilies.display;
  variables['--cp-font-ui'] = fontFamilies.ui;
  return variables;
}

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    ...paletteVariables(),
    '--cp-tap-target': `${layout.tapTarget}px`,
    '--cp-scroll-shadow': `${layout.scrollShadow}px`,
    '--cp-scroll-shadow-color': `color-mix(in srgb, ${scrollShadow.color} ${scrollShadow.alpha}%, transparent)`,
    '--cp-turn-strip': `${layout.turnStrip}px`,
    '--cp-status-bar': px(layout.statusBar),
    '--cp-content-edge': px(layout.contentEdge),
    '--cp-border': px(borderWidth.card),
    '--cp-control-s': px(layout.control.S),
    '--cp-control-m': px(layout.control.M),
    '--cp-control-l': px(layout.control.L),
    '--cp-header-row': `${layout.header.row}px`,
    '--cp-header-gap': `${layout.header.gap}px`,
    '--cp-header-second-row': `${layout.header.secondRow}px`,
    '--cp-header-pad-bottom': `${layout.header.padBottom}px`,
    '--cp-hp-number-duration': `${layout.hpNumberMs}ms`,
    '--cp-card-expand-duration': `${layout.cardExpandMs}ms`,
    '--cp-card-expand-easing': layout.cardExpandEasing,
    '--cp-list-inset-top': `${layout.listInset.top}px`,
    '--cp-list-inset-bottom': `${layout.listInset.bottom}px`,
    '--cp-list-gap': px(layout.listGap),
    '--cp-active-lift': `${layout.activeLift}px`,
    '--cp-active-shadow': shadowLayers(activeShadow),
    '--cp-role-tile-width': `${layout.roleTile.width}px`,
    '--cp-role-tile-inset': `${layout.roleTile.inset}px`,
    '--cp-unit-row': `${layout.unitRow}px`,
    '--cp-bottom-bar-height': px(layout.bottomBar.height),
    '--cp-bottom-bar-padding': box(layout.bottomBar.padding),
    '--cp-bottom-bar-border': px(layout.bottomBar.borderTop),
    '--cp-bottom-button': px(layout.bottomButton.height),
    '--cp-sheet-inset': px(layout.sheet.inset),
    '--cp-sheet-border': px(layout.sheet.border),
    '--cp-sheet-padding': px(layout.sheet.padding),
    '--cp-sheet-header-top': px(layout.sheet.headerTop),
    '--cp-dialog-inset': px(layout.dialog.inset),
    '--cp-dialog-padding': px(layout.dialog.padding),
    '--cp-drawer-width': px(layout.drawer.width),
    '--cp-drawer-padding': box(layout.drawer.padding),
    '--cp-page-transition-duration': `${layout.pageTransitionMs}ms`,
    '--cp-page-transition-easing': layout.sheetEasing,
  },
  light: {},
  dark: {},
});

export const theme: MantineThemeOverride = createTheme({
  focusRing: 'never',
  activeClassName: '',
  respectReducedMotion: false,
  cursorType: 'pointer',
  fontSmoothing: true,
  white: base.surface,
  black: base.ink,
  colors: {
    ink: colorsTuple(base.ink),
    primary: colorsTuple(base.primary),
  },
  primaryColor: 'primary',
  primaryShade: 0,
  autoContrast: false,
  fontFamily: fontFamilies.ui,
  fontFamilyMonospace: fontFamilies.ui,
  headings: {
    fontFamily: fontFamilies.display,
    fontWeight: '700',
    textWrap: 'pretty',
    sizes: {
      h1: { fontSize: px(fontSizes.display), lineHeight: String(lineHeights.tight) },
      h2: { fontSize: px(fontSizes.title), lineHeight: String(lineHeights.snug) },
      h3: { fontSize: px(fontSizes.heading), lineHeight: String(lineHeights.snug) },
      h4: { fontSize: px(fontSizes.number), lineHeight: String(lineHeights.snug) },
      h5: { fontSize: px(fontSizes.body), lineHeight: String(lineHeights.snug) },
      h6: { fontSize: px(fontSizes.small), lineHeight: String(lineHeights.snug) },
    },
  },
  fontSizes: {
    xs: px(fontSizes.meta),
    sm: px(fontSizes.small),
    md: px(fontSizes.body),
    lg: px(fontSizes.number),
    xl: px(fontSizes.heading),
    caps: px(fontSizes.caps),
    capsTile: px(fontSizes.capsTile),
    micro: px(fontSizes.micro),
    meta: px(fontSizes.meta),
    small: px(fontSizes.small),
    body: px(fontSizes.body),
    number: px(fontSizes.number),
    heading: px(fontSizes.heading),
    title: px(fontSizes.title),
    display: px(fontSizes.display),
  },
  lineHeights: {
    xs: String(lineHeights.tight),
    sm: String(lineHeights.snug),
    md: String(lineHeights.body),
    lg: String(lineHeights.body),
    xl: String(lineHeights.body),
    tight: String(lineHeights.tight),
    snug: String(lineHeights.snug),
    body: String(lineHeights.body),
  },
  spacing: {
    xs: px(4),
    sm: px(8),
    md: px(12),
    lg: px(16),
    xl: px(24),
    xxl: px(32),
  },
  radius: {
    xs: px(radius.segment),
    sm: px(radius.field),
    md: px(radius.card),
    lg: px(radius.sheet),
    xl: px(radius.full),
    segment: px(radius.segment),
    tile: px(radius.tile),
    field: px(radius.field),
    card: px(radius.card),
    sheet: px(radius.sheet),
    full: px(radius.full),
  },
  defaultRadius: 'sm',
  shadows: { xs: 'none', sm: 'none', md: 'none', lg: 'none', xl: 'none' },
  components: {
    Text: { classNames: { root: classes.text } },
    Title: { classNames: { root: classes.title } },
    Input: {
      defaultProps: { radius: 'field' },
      classNames: { input: classes.input },
    },
    InputWrapper: { classNames: { label: classes.label, error: classes.error } },
    Paper: { defaultProps: { radius: 'card', shadow: 'none' } },
    Modal: {
      defaultProps: {
        radius: 'sheet',
        centered: true,
        padding: layout.dialog.padding,
        shadow: 'none',
      },
      classNames: { content: classes.overlaySurface },
    },
    Popover: {
      defaultProps: { radius: 'card', shadow: 'none' },
      classNames: { dropdown: classes.overlaySurface },
    },
    Menu: {
      defaultProps: { radius: 'card', shadow: 'none' },
      classNames: { dropdown: classes.overlaySurface },
    },
    Drawer: { defaultProps: { size: layout.drawer.width, position: 'left', shadow: 'none' } },
  },
});
