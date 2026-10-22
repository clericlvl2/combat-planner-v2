import { healthStatus } from '@combat-planner/domain';
import type { HealthStatus } from '@combat-planner/domain';
import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import { expect, fn, userEvent } from 'storybook/test';
import { base, health, healthTints, hpActions } from '../../theme.ts';
import { HpBox } from './HpBox.tsx';
import type { HpBoxProps, HpBoxViewer } from './HpBox.tsx';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';

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

const pipsOf: Record<HealthStatus, number> = { full: 2, wounded: 1, staggered: 1, dead: 0 };

const boxFacts = (box: HTMLElement) => ({
  numbers: box.querySelector('[data-part="numbers"]')?.textContent ?? null,
  pips: box.querySelectorAll('[data-pip]').length,
  filled: box.querySelectorAll('[data-pip][data-filled]').length,
  status: box.querySelector('[data-part="status"]')?.textContent ?? null,
});

const boxExpected = (t: TFunction, hp: number, maxHp: number, viewer: HpBoxViewer = 'dm') => {
  const status = healthStatus(hp, maxHp);
  return {
    numbers: `${minus(hp)}/${maxHp}`,
    pips: 2,
    filled: pipsOf[status],
    status: viewer === 'dm' && status === 'full' ? null : t(status),
  };
};

const isVisuallyHidden = (element: Element | null) => {
  if (!element) return false;
  const box = element.getBoundingClientRect();
  return box.width <= 1 && box.height <= 1;
};

function HpBoxList({ boxes }: { boxes: readonly HpBoxProps[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: 12 }}>
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
        onClick={state === 'DM' || state === 'DM disabled' ? fn() : undefined}
      />
    );
  },
}));

const withTempHp: readonly HpBoxProps[] = [
  { viewer: 'dm', hp: 30, maxHp: 30, tempHp: 5 },
  { viewer: 'player', hp: 20, maxHp: 36, tempHp: 5, mine: true },
  { viewer: 'dm', hp: 999, maxHp: 999, tempHp: 999 },
];

const threeDigits: readonly HpBoxProps[] = [
  { viewer: 'dm', hp: 287, maxHp: 320, onClick: fn() },
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
  tags: ['visual'],
  render: () => <HpBoxList boxes={withTempHp} />,
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    for (const [index, amount] of [5, 5, 999].entries()) {
      const box = caseAt(canvasElement, index);
      const badge = box.querySelector<HTMLElement>('[data-part="temp-badge"]');
      if (!badge) throw new Error(`badge of case ${index} not rendered`);
      await expect(badge).toHaveTextContent(new RegExp(`^\\+${amount}$`));
      await expect(badge).toHaveAttribute('aria-hidden', 'true');
      await expect(badge).toBeVisible();
      await expect(getComputedStyle(badge).backgroundColor).toBe(rgb(hpActions.setTemp));
      await expect(getComputedStyle(badge).borderTopColor).toBe(rgb(base.surface));
      await expect(badge.getBoundingClientRect().height).toBe(18);
      await expect(badge.getBoundingClientRect().top - box.getBoundingClientRect().top).toBe(-8);
      await expect(box.getBoundingClientRect().right - badge.getBoundingClientRect().right).toBe(6);
      const temp = box.querySelector('[data-part="temp"]');
      await expect(temp).toHaveTextContent(t('temp', { amount }));
      await expect(isVisuallyHidden(temp)).toBe(true);
    }
    await expect(boxFacts(caseAt(canvasElement, 0))).toEqual(boxExpected(t, 30, 30));
  },
});

export const ThreeDigits = meta.story({
  tags: ['visual'],
  render: () => <HpBoxList boxes={threeDigits} />,
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    for (const [index, box] of threeDigits.entries()) {
      if (box.hp === undefined || box.preset) continue;
      const element = caseAt(canvasElement, index);
      await expect(boxFacts(element)).toEqual(boxExpected(t, box.hp, box.maxHp));
      const numbers = element.querySelector<HTMLElement>('[data-part="numbers"]');
      await expect(numbers?.getBoundingClientRect().width).toBeLessThanOrEqual(80);
    }
    await expect(canvas.getByText('−999')).toBeVisible();
    await expect(canvas.getByText('−105')).toBeVisible();
  },
});

export const Preset = meta.story({
  tags: ['visual'],
  render: () => (
    <HpBoxList
      boxes={[
        { viewer: 'dm', preset: true, maxHp: 40 },
        { viewer: 'dm', preset: true, maxHp: 999 },
      ]}
    />
  ),
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    const box = caseAt(canvasElement, 0);
    await expect(box).toHaveTextContent(`40${t('hp')}`);
    await expect(box.querySelectorAll('[data-pip]')).toHaveLength(0);
    await expect(box.querySelector('[data-part="status"]')).toBeNull();
    await expect(getComputedStyle(box).backgroundColor).toBe(rgb(base.soft));
    await expect(caseAt(canvasElement, 1)).toHaveTextContent(`999${t('hp')}`);
  },
});

export const DmFacts = meta.story({
  tags: ['!dev'],
  render: () => <HpBoxList boxes={dmCases} />,
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    const staggered = caseAt(canvasElement, 0);
    await expect(boxFacts(staggered)).toEqual(boxExpected(t, 14, 40));
    await expect(staggered.getBoundingClientRect().width).toBe(80);
    await expect(staggered.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    await expect(getComputedStyle(staggered).borderTopWidth).toBe('0px');
    await expect(getComputedStyle(staggered).backgroundColor).toBe(rgb(healthTints.staggered));
    await expect(isVisuallyHidden(staggered.querySelector('[data-part="status"]'))).toBe(true);
    const filled = staggered.querySelector<HTMLElement>('[data-pip][data-filled]');
    await expect(filled && getComputedStyle(filled).backgroundColor).toBe(rgb(health.staggered));
    await expect(filled?.getBoundingClientRect().width).toBe(24);
    await expect(filled?.getBoundingClientRect().height).toBe(5);
    const empty = staggered.querySelector<HTMLElement>('[data-pip]:not([data-filled])');
    await expect(empty && getComputedStyle(empty).backgroundColor).toBe(rgb(health.empty));
    const dead = caseAt(canvasElement, 1);
    await expect(boxFacts(dead)).toEqual(boxExpected(t, -3, 18));
    await expect(getComputedStyle(dead).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    const disabled = caseAt(canvasElement, 2);
    await expect(boxFacts(disabled)).toEqual(boxExpected(t, 18, 18));
    await expect(getComputedStyle(disabled).backgroundColor).toBe('rgba(0, 0, 0, 0)');
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
    await expect(boxFacts(full)).toEqual(boxExpected(t, 52, 52, 'player'));
    await expect(getComputedStyle(full).backgroundColor).toBe(rgb(healthTints.full));
    const wounded = caseAt(canvasElement, 1);
    await expect(boxFacts(wounded)).toEqual(boxExpected(t, 24, 40, 'player'));
    await expect(getComputedStyle(wounded).backgroundColor).toBe(rgb(healthTints.wounded));
    const own = caseAt(canvasElement, 2);
    const ownNumbers = own.querySelector('[data-part="numbers"]');
    await expect(ownNumbers && getComputedStyle(ownNumbers).borderBottomStyle).toBe('dashed');
    await expect(getComputedStyle(own).backgroundColor).toBe(rgb(healthTints.staggered));
    const enemy = caseAt(canvasElement, 3);
    await expect(boxFacts(enemy)).toEqual({
      numbers: null,
      pips: 2,
      filled: 1,
      status: t('staggered'),
    });
    await expect(getComputedStyle(enemy).backgroundColor).toBe(rgb(healthTints.staggered));
    const enemyDead = caseAt(canvasElement, 4);
    await expect(boxFacts(enemyDead)).toEqual({
      numbers: null,
      pips: 2,
      filled: 0,
      status: t('dead'),
    });
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
    const tints: Record<HealthStatus, string> = {
      full: rgb(healthTints.full),
      wounded: rgb(healthTints.wounded),
      staggered: rgb(healthTints.staggered),
      dead: 'rgba(0, 0, 0, 0)',
    };
    for (const hp of [40, 24, 14, 6, -3]) {
      const step = canvasElement.querySelector<HTMLElement>(`[data-step="${hp}"]`);
      if (!step) throw new Error(`step ${hp} not rendered`);
      await expect(boxFacts(boxOf(step))).toEqual(boxExpected(t, hp, 40));
      await expect(getComputedStyle(boxOf(step)).backgroundColor).toBe(tints[healthStatus(hp, 40)]);
    }
  },
});

export const EditableIsUnderlined = meta.story({
  tags: ['!dev'],
  render: () => (
    <HpBoxList
      boxes={[
        { viewer: 'dm', hp: 287, maxHp: 320, onClick: fn() },
        { viewer: 'dm', hp: 287, maxHp: 320 },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const underlineOf = (index: number) => {
      const numbers = caseAt(canvasElement, index).querySelector('[data-part="numbers"]');
      return numbers && getComputedStyle(numbers).borderBottomStyle;
    };
    await expect(underlineOf(0)).toBe('dashed');
    await expect(underlineOf(1)).toBe('none');
  },
});

export const ClickOpensCalculator = meta.story({
  tags: ['!dev'],
  args: { viewer: 'dm', hp: 14, maxHp: 40, onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'HpBox');
    await userEvent.click(canvas.getByRole('button', { name: `14 /40 ${t('staggered')}` }));
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
    await expect(canvas.getByText(t('wounded'))).toBeInTheDocument();
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
