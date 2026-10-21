import { healthSegments, healthStatus } from '@combat-planner/domain';
import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import { expect, fn, userEvent } from 'storybook/test';
import { base, health, healthTints, hpActions } from '../../theme.ts';
import { HpBox } from './HpBox.tsx';
import type { HpBoxProps } from './HpBox.tsx';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { escapeRegExp, storyT } from '../../storybook/storyT.ts';

function HpBoxCell(props: HpBoxProps) {
  return (
    <div style={{ display: 'flex', padding: 12 }}>
      <HpBox {...props} />
    </div>
  );
}

const meta = preview.meta({
  title: 'Molecules/HpBox',
  component: HpBoxCell,
  args: { viewer: 'dm', hp: 40, maxHp: 40 },
});

const rgb = (hex: string) => {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
};

const boxOf = (canvasElement: HTMLElement) => {
  const box = canvasElement.querySelector<HTMLElement>('[data-viewer]');
  if (!box) throw new Error('HpBox not rendered');
  return box;
};

const minus = (value: number) => (value < 0 ? `−${Math.abs(value)}` : String(value));

const dmBoxFacts = (box: HTMLElement) => ({
  numbers: box.querySelector('[data-part="numbers"]')?.textContent ?? null,
  segments: box.querySelectorAll('[data-segment][data-filled]').length,
  status: box.querySelector('[data-part="status"]')?.textContent ?? null,
});

const dmBoxExpected = (t: TFunction, hp: number, maxHp: number) => {
  const status = healthStatus(hp, maxHp);
  return {
    numbers: `${minus(hp)}/${maxHp}`,
    segments: healthSegments(status, hp, maxHp),
    status: status === 'full' ? null : t(status),
  };
};

function HpBoxList({ boxes }: { boxes: readonly HpBoxProps[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 12 }}>
      {boxes.map((box, index) => (
        <div key={index} data-case={index}>
          <HpBox {...box} />
        </div>
      ))}
    </div>
  );
}

const caseAt = (canvasElement: HTMLElement, index: number) => {
  const element = canvasElement.querySelector<HTMLElement>(`[data-case="${index}"]`);
  if (!element) throw new Error(`case ${index} not rendered`);
  return boxOf(element);
};

const columns = ['DM', 'DM disabled', 'Player', 'Own hero', 'Enemy view'] as const;

type HpBoxState = (typeof columns)[number];

const gridRows = [
  { label: 'Full', hp: 40 },
  { label: 'Wounded', hp: 24 },
  { label: 'Staggered', hp: 14 },
  { label: 'Staggered low', hp: 6 },
  { label: 'Dead', hp: -3 },
].map(({ label, hp }) => ({
  label,
  render: (state: HpBoxState) => {
    if (state === 'Enemy view') return <HpBox viewer="player" status={healthStatus(hp, 40)} />;
    return (
      <HpBox
        viewer={state === 'DM' || state === 'DM disabled' ? 'dm' : 'player'}
        hp={hp}
        maxHp={40}
        disabled={state === 'DM disabled'}
        mine={state === 'Own hero'}
      />
    );
  },
}));

const withTempHp: readonly HpBoxProps[] = [
  { viewer: 'dm', hp: 30, maxHp: 30, tempHp: 5 },
  { viewer: 'player', hp: 20, maxHp: 36, tempHp: 5, mine: true },
  { viewer: 'player', hp: 187, maxHp: 240, tempHp: 120 },
];

const threeDigits: readonly HpBoxProps[] = [
  { viewer: 'dm', hp: 287, maxHp: 320 },
  { viewer: 'dm', hp: 112, maxHp: 320, tempHp: 120 },
  { viewer: 'dm', hp: -999, maxHp: 999 },
  { viewer: 'dm', hp: 999, maxHp: 999 },
  { viewer: 'dm', hp: -105, maxHp: 320 },
];

const dmCases: readonly HpBoxProps[] = [
  { viewer: 'dm', hp: 14, maxHp: 40, tempHp: 5 },
  { viewer: 'dm', hp: -3, maxHp: 18 },
  { viewer: 'dm', hp: 18, maxHp: 18, disabled: true },
];

const playerCases: readonly HpBoxProps[] = [
  { viewer: 'player', hp: 52, maxHp: 52 },
  { viewer: 'player', hp: 24, maxHp: 40 },
  { viewer: 'player', hp: 13, maxHp: 36, mine: true },
  { viewer: 'player', status: 'staggered' },
  { viewer: 'player', status: 'dead' },
];

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => <StateGrid rows={gridRows} columns={columns} />,
});

export const WithTempHp = meta.story({
  render: () => <HpBoxList boxes={withTempHp} />,
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    const tempOf = (index: number) => {
      const temp = [...caseAt(canvasElement, index).querySelectorAll('span')].find(
        (span) => span.textContent === t('temp', { amount: index === 2 ? 120 : 5 }),
      );
      if (!temp) throw new Error(`temp of case ${index} not rendered`);
      return temp;
    };
    await expect(dmBoxFacts(caseAt(canvasElement, 0))).toEqual(dmBoxExpected(t, 30, 30));
    await expect(getComputedStyle(tempOf(0)).color).toBe(rgb(base.ink));
    await expect(getComputedStyle(tempOf(1)).color).toBe(rgb(hpActions.setTemp));
    await expect(caseAt(canvasElement, 2)).toHaveTextContent(t('wounded'));
    await expect(tempOf(2)).toBeVisible();
  },
});

export const ThreeDigits = meta.story({
  tags: ['visual'],
  render: () => <HpBoxList boxes={threeDigits} />,
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    for (const [index, box] of threeDigits.entries()) {
      if (box.hp === undefined) continue;
      await expect(dmBoxFacts(caseAt(canvasElement, index))).toEqual(
        dmBoxExpected(t, box.hp, box.maxHp),
      );
    }
    await expect(canvas.getByText(t('temp', { amount: 120 }))).toBeVisible();
    await expect(canvas.getByText('−999')).toBeVisible();
    await expect(canvas.getByText('−105')).toBeVisible();
  },
});

export const DmFacts = meta.story({
  tags: ['!dev'],
  render: () => <HpBoxList boxes={dmCases} />,
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    const staggered = caseAt(canvasElement, 0);
    await expect(dmBoxFacts(staggered)).toEqual(dmBoxExpected(t, 14, 40));
    await expect(staggered).toHaveTextContent(t('temp', { amount: 5 }));
    await expect(staggered.getBoundingClientRect().width).toBe(96);
    await expect(getComputedStyle(staggered).borderTopColor).toBe(rgb(base.border));
    const status = staggered.querySelector<HTMLElement>('[data-part="status"]');
    await expect(status && getComputedStyle(status).color).toBe(rgb(health.staggered));
    const dead = caseAt(canvasElement, 1);
    await expect(dmBoxFacts(dead)).toEqual(dmBoxExpected(t, -3, 18));
    await expect(getComputedStyle(dead).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    const disabled = caseAt(canvasElement, 2);
    await expect(dmBoxFacts(disabled)).toEqual(dmBoxExpected(t, 18, 18));
    await expect(getComputedStyle(disabled).borderTopColor).toBe('rgba(0, 0, 0, 0)');
    const numbers = disabled.querySelector<HTMLElement>('[data-part="numbers"]');
    const hp =
      numbers && [...numbers.querySelectorAll('span')].find((span) => span.textContent === '18');
    await expect(hp && getComputedStyle(hp).color).toBe(rgb(base.secondary));
  },
});

export const PlayerTints = meta.story({
  tags: ['!dev'],
  render: () => <HpBoxList boxes={playerCases} />,
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    const full = caseAt(canvasElement, 0);
    await expect(full).toHaveTextContent(t('full'));
    await expect(full.querySelectorAll('[data-segment]')).toHaveLength(0);
    await expect(getComputedStyle(full).backgroundColor).toBe(rgb(healthTints.full));
    await expect(getComputedStyle(caseAt(canvasElement, 1)).backgroundColor).toBe(
      rgb(healthTints.wounded),
    );
    const own = caseAt(canvasElement, 2);
    const ownNumbers = own.firstElementChild;
    await expect(ownNumbers && getComputedStyle(ownNumbers).borderBottomStyle).toBe('dashed');
    await expect(getComputedStyle(own).backgroundColor).toBe(rgb(healthTints.staggered));
    await expect(caseAt(canvasElement, 3)).toHaveTextContent(
      new RegExp(`^${escapeRegExp(t('staggered'))}$`),
    );
    const enemyDead = caseAt(canvasElement, 4);
    await expect(enemyDead).toHaveTextContent(new RegExp(`^${escapeRegExp(t('dead'))}$`));
    await expect(getComputedStyle(enemyDead).backgroundColor).toBe(rgb(base.soft));
  },
});

export const DamageSteps = meta.story({
  tags: ['!dev'],
  args: { viewer: 'dm', hp: 40, maxHp: 40 },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 12 }}>
      {[40, 24, 14, 6, -3].map((hp) => (
        <div key={hp} data-step={hp}>
          <HpBox viewer="dm" hp={hp} maxHp={40} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    for (const hp of [40, 24, 14, 6, -3]) {
      const step = canvasElement.querySelector<HTMLElement>(`[data-step="${hp}"]`);
      if (!step) throw new Error(`step ${hp} not rendered`);
      await expect(dmBoxFacts(boxOf(step))).toEqual(dmBoxExpected(t, hp, 40));
    }
  },
});

export const ClickOpensCalculator = meta.story({
  tags: ['!dev'],
  args: { viewer: 'dm', hp: 14, maxHp: 40, onClick: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const EnemyIsReadOnly = meta.story({
  tags: ['!dev'],
  args: { viewer: 'player', status: 'wounded', hp: undefined, maxHp: undefined, onClick: fn() },
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(canvas.queryByRole('button')).toBeNull();
    await userEvent.click(boxOf(canvasElement));
    await expect(args.onClick).not.toHaveBeenCalled();
    await expect(canvas.getByText(t('wounded'))).toBeVisible();
  },
});

export const DisabledStillOpens = meta.story({
  tags: ['!dev'],
  args: { viewer: 'dm', hp: 18, maxHp: 18, disabled: true, onClick: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});
