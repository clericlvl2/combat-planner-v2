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
import { layout } from './layout.ts';
import classes from './theme.module.css';

export const base = {
  background: '#FAF6EE',
  surface: '#FFFFFF',
  soft: '#F3EDE2',
  highlight: '#FFF4D2',
  accent: '#FFE7A3',
  border: '#E2D8C6',
  disabled: '#E6DDCC',
  ink: '#231F1C',
  inkPressed: '#3A3531',
  secondary: '#5F574D',
  muted: '#8C8578',
} as const;

export const roles = {
  hero: '#1E5FA8',
  enemy: '#B4232A',
  ally: '#2D7D46',
  inactive: '#5F574D',
  inactiveFill: '#F3EDE2',
} as const;

export const health = {
  full: '#2E7A43',
  staggered: '#B33A0A',
  dead: '#57534E',
  empty: '#E6DDCC',
} as const;

export const healthTints = {
  full: '#E3F1E6',
  staggered: '#FBE3D8',
} as const;

export const hpActions = {
  damage: '#B4232A',
  heal: '#2E7A43',
  setTemp: '#1E5FA8',
  setMax: '#A85400',
  dangerSoft: '#F7E4E2',
} as const;

export const interaction = {
  focus: '#1E5FA8',
  tapMarker: '#FFE7A3',
  dangerPressed: '#9B1C1C',
} as const;

export const historyTemp = { fill: '#DCE6F7', text: '#1E4E8C' } as const;

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

export const conditions: Record<ConditionName, { fill: string; text: string }> = {
  charmed: { fill: '#F9DDE6', text: '#8A2448' },
  confused: { fill: '#DDEFD5', text: '#2F6B1F' },
  dazed: { fill: '#FFF1B8', text: '#6B5600' },
  fear: { fill: '#E3E1DC', text: '#3D3A35' },
  helpless: { fill: '#F6DCD5', text: '#8A2E17' },
  hampered: { fill: '#D7EBF5', text: '#12506E' },
  shocked: { fill: '#D5F0F0', text: '#0E5E63' },
  stuck: { fill: '#E9DFD1', text: '#5C4026' },
  stunned: { fill: '#FBE0C2', text: '#8A3F00' },
  vulnerable: { fill: '#F8D7D7', text: '#9B1C1C' },
  weakened: { fill: '#EDE6C9', text: '#5E5214' },
};

export const combatColors = [
  '#B4232A',
  '#A85400',
  '#8A6A00',
  '#2E7A43',
  '#0E5E63',
  '#1E5FA8',
  '#5C4026',
  '#8C8578',
] as const;

export const palette = {
  base,
  roles,
  health,
  healthTints,
  hpActions,
  interaction,
  conditions,
  combatColors,
} as const;

export const fontFamilies = {
  display: "'Unbounded', 'Noto Sans JP', sans-serif",
  ui: "'Rubik', 'Noto Sans JP', sans-serif",
} as const;

export const fontSizes = {
  caps: 8,
  micro: 11,
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
  card: 16,
  sheet: 24,
  full: 9999,
} as const;

export const iconSizes = [16, 20, 24, 32] as const;

export const borderWidth = { default: 2, divider: 1 } as const;

export const focusRing = { width: 2, color: interaction.focus, offset: 2 } as const;

export const tapMarker = { width: 3, color: interaction.tapMarker, offset: 2 } as const;

const px = (value: number) => `${value}px`;

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
  combatColors.forEach((value, index) => {
    variables[`--cp-combat-${index}`] = value;
  });
  variables['--cp-font-display'] = fontFamilies.display;
  variables['--cp-font-ui'] = fontFamilies.ui;
  return variables;
}

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: { ...paletteVariables(), '--cp-tap-target': `${layout.tapTarget}px` },
  light: {},
  dark: {},
});

export const theme: MantineThemeOverride = createTheme({
  focusRing: 'never',
  focusClassName: classes.focus,
  activeClassName: '',
  respectReducedMotion: false,
  cursorType: 'pointer',
  fontSmoothing: true,
  white: base.surface,
  black: base.ink,
  colors: {
    ink: colorsTuple(base.ink),
    hero: colorsTuple(roles.hero),
    enemy: colorsTuple(roles.enemy),
    ally: colorsTuple(roles.ally),
    damage: colorsTuple(hpActions.damage),
    heal: colorsTuple(hpActions.heal),
    setTemp: colorsTuple(hpActions.setTemp),
    setMax: colorsTuple(hpActions.setMax),
  },
  primaryColor: 'ink',
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
      defaultProps: { radius: 'sheet', centered: true, padding: 16, shadow: 'none' },
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
    Drawer: { defaultProps: { size: 300, position: 'left', shadow: 'none' } },
  },
});
