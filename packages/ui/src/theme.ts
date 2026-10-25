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
  background: '#EBDFD4',
  field: '#E4D5C7',
  surface: '#F9F4EC',
  soft: '#F1E6DA',
  highlight: '#F3E2C7',
  accent: '#EFA831',
  accentText: '#302017',
  border: '#BFAE9E',
  disabled: '#D7CBC1',
  ink: '#302017',
  inkPressed: '#45342A',
  secondary: '#6B5A4D',
  muted: '#938374',
  chrome: '#3D4E2B',
  chromeText: '#F9F4EC',
  primary: '#3D4E2B',
  primaryText: '#F9F4EC',
  primaryPressed: '#50623E',
  sheet: '#F9F4EC',
  sheetBorder: '#3D4E2B',
} as const;

export const roles = {
  hero: '#1E59CD',
  heroText: '#FFFFFF',
  enemy: '#C50710',
  enemyText: '#FFFFFF',
  ally: '#007570',
  allyText: '#FFFFFF',
  inactive: '#766558',
  inactiveText: '#FFFFFF',
  inactiveFill: '#E8DCD1',
} as const;

export const health = {
  full: '#009157',
  wounded: '#938010',
  staggered: '#AF2D18',
  unconscious: '#7D3AB7',
  dead: '#5A5450',
  empty: '#D7CBC1',
} as const;

export const healthTints = {
  full: '#C9EFD9',
  wounded: '#F5E5A8',
  staggered: '#FFDDC6',
  unconscious: '#EBDEFD',
} as const;

export const hpActions = {
  damage: '#C50710',
  damageText: '#FFFFFF',
  heal: '#0C7830',
  healText: '#FFFFFF',
  setTemp: '#1E59CD',
  setTempText: '#FFFFFF',
  setMax: '#CF9A35',
  setMaxText: '#302017',
  dangerSoft: '#FCE1DD',
} as const;

export const interaction = {
  focus: '#1E59CD',
  tapMarker: '#EFA831',
  bracket: '#302017',
  dangerPressed: '#9E0008',
} as const;

export const historyTemp = { fill: '#D8E5FD', text: '#1E4EAC' } as const;

export const historyMax = { text: '#785300' } as const;

export const toast = {
  fill: '#302017',
  text: '#F9F4EC',
  action: '#EFA831',
  pressed: '#45342A',
  info: '#F1E6DA',
  infoText: '#302017',
  success: '#0C7830',
  successText: '#FFFFFF',
  warning: '#EFA831',
  warningText: '#302017',
  error: '#C50710',
  errorText: '#FFFFFF',
} as const;

export const landing = {
  deskField: '#E4D5C7',
  deskText: '#302017',
  plane: '#253317',
  planeDot: '#EFA831',
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

export const conditions: Record<ConditionName, { fill: string; text: string }> = {
  charmed: { fill: '#F9D1E3', text: '#5E3248' },
  confused: { fill: '#D0E6C5', text: '#314B24' },
  dazed: { fill: '#E8DEB9', text: '#4E420D' },
  fear: { fill: '#E1DED5', text: '#464239' },
  helpless: { fill: '#FDD3C8', text: '#623428' },
  hampered: { fill: '#BDE5F9', text: '#0C4960' },
  shocked: { fill: '#B8E9E9', text: '#004D4F' },
  stuck: { fill: '#F1DABA', text: '#573D0F' },
  stunned: { fill: '#FBD5C1', text: '#60361E' },
  vulnerable: { fill: '#FED1D2', text: '#623234' },
  weakened: { fill: '#DFE2BC', text: '#454513' },
};

export const combatColors = [
  '#C50710',
  '#BB5D00',
  '#938010',
  '#009157',
  '#007570',
  '#1E59CD',
  '#6B5A4D',
  '#938374',
] as const;

export const palette = {
  base,
  roles,
  health,
  healthTints,
  hpActions,
  interaction,
  historyTemp,
  historyMax,
  toast,
  landing,
  conditions,
  combatColors,
} as const;

export const fontFamilies = {
  display: "'Unbounded', 'Noto Sans JP', sans-serif",
  ui: "'Rubik', 'Noto Sans JP', sans-serif",
} as const;

export const fontSizes = {
  capsTile: 7,
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
  tile: 10,
  card: 16,
  sheet: 24,
  full: 9999,
} as const;

export const iconSizes = [16, 20, 24, 32] as const;

export const borderWidth = { default: 2, divider: 1 } as const;

export const focusRing = { width: 2, color: interaction.focus, offset: 2 } as const;

export const tapMarker = { width: 3, color: interaction.tapMarker, offset: 2 } as const;

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
    'history-max': historyMax,
    state: interaction,
    toast,
    landing,
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
  variables: {
    ...paletteVariables(),
    '--cp-tap-target': `${layout.tapTarget}px`,
    '--cp-scroll-shadow': `${layout.scrollShadow}px`,
    '--cp-scroll-shadow-color': `color-mix(in srgb, ${scrollShadow.color} ${scrollShadow.alpha}%, transparent)`,
    '--cp-turn-strip': `${layout.turnStrip}px`,
    '--cp-hp-number-duration': `${layout.hpNumberMs}ms`,
    '--cp-list-inset-top': `${layout.listInset.top}px`,
    '--cp-list-inset-bottom': `${layout.listInset.bottom}px`,
    '--cp-card-gap': `${layout.cardGap}px`,
    '--cp-active-lift': `${layout.activeLift}px`,
    '--cp-active-shadow': shadowLayers(activeShadow),
    '--cp-role-tile-width': `${layout.roleTile.width}px`,
    '--cp-role-tile-inset': `${layout.roleTile.inset}px`,
  },
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
    primary: colorsTuple(base.primary),
    hero: colorsTuple(roles.hero),
    enemy: colorsTuple(roles.enemy),
    ally: colorsTuple(roles.ally),
    damage: colorsTuple(hpActions.damage),
    heal: colorsTuple(hpActions.heal),
    wounded: colorsTuple(health.wounded),
    setTemp: colorsTuple(hpActions.setTemp),
    setMax: colorsTuple(hpActions.setMax),
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
