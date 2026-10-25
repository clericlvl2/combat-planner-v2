import {
  base,
  combatColors,
  conditionNames,
  conditions,
  fontFamilies,
  fontSizes,
  health,
  hpActions,
  radius,
  roles,
  seeds,
  spacing,
} from '../../theme.ts';
import classes from './ThemeAudit.module.css';

interface Token {
  name: string;
  hex: string;
  role: string;
  fill: string;
  sample?: string;
  sampleColor?: string;
}

interface TokenGroup {
  title: string;
  items: Token[];
  wide?: boolean;
}

const onDark = base.onChrome;

const combatColorNames = ['red', 'umber', 'ochre', 'green', 'teal', 'blue', 'brown', 'grey'];

const token = (
  name: string,
  fill: string,
  role: string,
  sample?: string,
  sampleColor?: string,
): Token => ({
  name,
  hex: fill,
  role,
  fill,
  sample,
  sampleColor,
});

const tokenGroups: TokenGroup[] = [
  {
    title: 'Seeds',
    items: [
      token('paper', seeds.paper, 'Paper: surface, text on colour'),
      token('ink', seeds.ink, 'Ink: text, selected fills', 'Aa', onDark),
      token('moss', seeds.moss, 'Moss: headers, primary, overlay border', 'Aa', onDark),
      token('brass', seeds.brass, 'Brass: accent, tap marker', 'Aa', base.onAccent),
      token('hero', seeds.hero, 'Hero, focus, temp HP', 'Aa', onDark),
      token('enemy', seeds.enemy, 'Enemy, damage, danger', 'Aa', onDark),
      token('ally', seeds.ally, 'Ally', 'Aa', onDark),
      token('full', seeds.full, 'Full health'),
      token('wounded', seeds.wounded, 'Wounded'),
      token('staggered', seeds.staggered, 'Staggered', 'Aa', onDark),
      token('unconscious', seeds.unconscious, 'Unconscious', 'Aa', onDark),
      token('max', seeds.max, 'Max HP', 'Aa', onDark),
    ],
  },
  {
    title: 'Base',
    items: [
      token('background', base.background, 'Screen background: paper −6 L'),
      token('field', base.field, 'Field under the card lists: paper −9 L'),
      token('surface', base.surface, 'Surface: cards, fields, overlays'),
      token('soft', base.soft, 'Soft: keys, chips, dead card: paper −4 L'),
      token('highlight', base.highlight, 'Highlight: brass 25 % in paper'),
      token('accent', base.accent, 'Accent: active turn, current item: brass +10 L'),
      token('onAccent', base.onAccent, 'Text on accent'),
      token('border', base.border, 'Border, divider, empty pip: paper −32 L'),
      token('disabled', base.disabled, 'Disabled fill: paper −12 L'),
      token('ink', base.ink, 'Ink: text, selected fills, active border', 'Aa', onDark),
      token('inkPressed', base.inkPressed, 'Ink pressed: ink +8 L', 'Aa', onDark),
      token('secondary', base.secondary, 'Secondary text: ink +12 L', 'Aa', onDark),
      token('muted', base.muted, 'Muted: placeholders, dashed lines: ink +36 L', 'Aa', onDark),
      token('chrome', base.chrome, 'Every header', 'Aa', base.onChrome),
      token('onChrome', base.onChrome, 'Text on chrome'),
      token(
        'primary',
        base.primary,
        'Primary button, turn strip, overlay border',
        'Aa',
        base.onPrimary,
      ),
      token('onPrimary', base.onPrimary, 'Text on primary'),
      token(
        'primaryPressed',
        base.primaryPressed,
        'Primary pressed: moss +7 L',
        'Aa',
        base.onPrimary,
      ),
      token('primaryDeep', base.primaryDeep, 'Landing table: moss −10 L', 'Aa', base.onPrimary),
    ],
  },
  {
    title: 'Roles',
    items: [
      token('hero', roles.hero, 'Hero', '15', roles.on),
      token('enemy', roles.enemy, 'Enemy', '17', roles.on),
      token('ally', roles.ally, 'Ally', '9', roles.on),
      token('inactive', roles.inactive, 'Role block when dead: ink +26 L', '12', roles.on),
      token('on', roles.on, 'Text on a role'),
      token('heroText', roles.heroText, 'Hero as text: hero −12 L', 'Aa', onDark),
    ],
  },
  {
    title: 'Health',
    items: [
      token('full', health.full, 'Full, at max: 2 pips'),
      token('wounded', health.wounded, 'Wounded, 50% and up: 2 pips'),
      token('staggered', health.staggered, 'Staggered, below 50%: 1 pip'),
      token('unconscious', health.unconscious, 'Hero unconscious, 0 to −½ max: 0 pips, Zzz icon'),
      token('dead', health.dead, 'Dead: 0 pips, name struck: ink +19 L'),
    ],
  },
  {
    title: 'HP actions',
    items: [
      token(
        'damage',
        hpActions.damage,
        'Damage; damage in history; defense down',
        'Aa',
        hpActions.on,
      ),
      token(
        'heal',
        hpActions.heal,
        'Heal; healing in history; defense up: full −8 L',
        'Aa',
        hpActions.on,
      ),
      token('healText', hpActions.healText, 'Heal as small text: full −20 L', 'Aa', onDark),
      token('setTemp', hpActions.setTemp, 'Set Temp', 'Aa', hpActions.on),
      token('max', hpActions.max, 'Set Max; max in history', 'Aa', hpActions.on),
      token('on', hpActions.on, 'Text on an HP action'),
      token('dangerSoft', hpActions.dangerSoft, 'Danger soft fill: 93 % 0.03 of enemy'),
    ],
  },
  {
    title: 'Conditions (fill / text)',
    wide: true,
    items: conditionNames.map((name) => ({
      name,
      hex: `${conditions[name].fill} / ${conditions[name].text}`,
      role: name,
      fill: conditions[name].fill,
      sample: 'Aa',
      sampleColor: conditions[name].text,
    })),
  },
  {
    title: 'Combat colours',
    items: combatColors.map((hex, index) =>
      token(String(index), hex, combatColorNames[index] ?? '', String(index), onDark),
    ),
  },
];

const typeScale = [
  {
    name: 'Display',
    spec: 'Unbounded 700 · 44',
    display: true,
    size: fontSizes.display,
    weight: 700,
    sample: '14/40',
  },
  {
    name: 'Title',
    spec: 'Unbounded 700 · 28',
    display: true,
    size: fontSizes.title,
    weight: 700,
    sample: 'Combats',
  },
  {
    name: 'Heading',
    spec: 'Unbounded 700 · 22',
    display: true,
    size: fontSizes.heading,
    weight: 700,
    sample: 'Sort combats',
  },
  {
    name: 'Number / Button',
    spec: 'Unbounded 700 · 18',
    display: true,
    size: fontSizes.number,
    weight: 700,
    sample: 'Next turn',
  },
  {
    name: 'Body',
    spec: 'Rubik 400–600 · 16',
    display: false,
    size: fontSizes.body,
    weight: 600,
    sample: 'Brother Tomas of the Silver Lantern Order',
  },
  {
    name: 'Small',
    spec: 'Rubik 400–600 · 14',
    display: false,
    size: fontSizes.small,
    weight: 600,
    sample: 'Duplicate',
  },
  {
    name: 'Meta',
    spec: 'Rubik 600–700 · 12',
    display: false,
    size: fontSizes.meta,
    weight: 600,
    sample: 'Round 3 · 6 units',
    secondary: true,
  },
  {
    name: 'Micro',
    spec: 'Rubik 700 · 12',
    display: false,
    size: fontSizes.micro,
    weight: 700,
    sample: 'HP · AC · ENEMY',
  },
  {
    name: 'Caps',
    spec: 'Rubik 700 · 12 · caps',
    display: false,
    size: fontSizes.caps,
    weight: 700,
    sample: 'HERO · ENEMY · ALLY',
  },
];

const radii = [
  { label: '2', value: radius.segment },
  { label: '12', value: radius.field },
  { label: '16', value: radius.card },
  { label: '24', value: radius.sheet },
  { label: 'full', value: 28 },
];

function SwatchList({ group }: { group: TokenGroup }) {
  return (
    <section className={classes.panel} aria-label={group.title}>
      <h2 className={classes.panelTitle}>{group.title}</h2>
      <ul className={group.wide ? `${classes.swatches} ${classes.swatchesWide}` : classes.swatches}>
        {group.items.map((item) => (
          <li key={`${item.hex}-${item.role}`} className={classes.row}>
            <span
              className={classes.swatch}
              style={{ background: item.fill, color: item.sampleColor }}
              data-hex={item.fill}
            >
              {item.sample}
            </span>
            <span className={classes.hex}>{item.hex}</span>
            <span className={classes.role} title={item.role}>
              {item.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ThemeAudit() {
  return (
    <div className={classes.root}>
      <div className={classes.colors}>
        {tokenGroups.map((group) => (
          <SwatchList key={group.title} group={group} />
        ))}
        <section className={classes.panel} aria-label="Typefaces">
          <h2 className={classes.panelTitle}>Typefaces</h2>
          <span className={classes.faceDisplay} style={{ fontFamily: fontFamilies.display }}>
            Round 3 · 14/40
          </span>
          <span className={classes.faceUi}>Rubik · Brother Tomas</span>
          <span className={classes.faceUi}>Noto Sans JP · 影の射手</span>
          <span className={classes.note}>Tabler Icons 16 / 20 / 24 / 32</span>
        </section>
      </div>
      <section className={classes.panel} aria-label="Type scale">
        <h2 className={classes.panelTitle}>Type scale</h2>
        <ul className={classes.list}>
          {typeScale.map((step) => (
            <li key={step.name} className={classes.typeRow}>
              <span className={classes.typeName}>
                {step.name} <span className={classes.typeSpec}>{step.spec}</span>
              </span>
              <span
                className={classes.typeSample}
                style={{
                  fontFamily: step.display ? fontFamilies.display : fontFamilies.ui,
                  fontSize: step.size,
                  fontWeight: step.weight,
                  color: step.secondary ? base.secondary : base.ink,
                }}
              >
                {step.sample}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className={classes.split} aria-label="Radii and spacing">
        <div className={classes.panel}>
          <h2 className={classes.panelTitle}>Radii</h2>
          <div className={classes.samples}>
            {radii.map((item) => (
              <div key={item.label} className={classes.sample}>
                <span className={classes.radiusBox} style={{ borderRadius: item.value }} />
                <span className={classes.sampleLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={classes.panel}>
          <h2 className={classes.panelTitle}>Spacing</h2>
          <div className={classes.samples}>
            {spacing.map((value) => (
              <div key={value} className={classes.sample}>
                <span className={classes.spaceBox} style={{ width: value, height: value }} />
                <span className={classes.sampleLabel}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
