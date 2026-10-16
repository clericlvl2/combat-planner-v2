import type { HpHistoryEntry } from '@combat-planner/domain';
import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { base, conditions, hpActions } from '../../theme.ts';
import { HistoryRow } from './HistoryRow.tsx';
import type { HistoryRowProps } from './HistoryRow.tsx';

function HistoryRowCell(props: HistoryRowProps) {
  return (
    <div style={{ width: 334, padding: '0 12px', background: base.surface }}>
      <HistoryRow {...props} />
    </div>
  );
}

const at = '2026-10-16T18:00:00.000Z';

const entry = (
  fields: Pick<HpHistoryEntry, 'kind' | 'amount' | 'previous' | 'result'> & Partial<HpHistoryEntry>,
): HpHistoryEntry => ({
  absorbed: 0,
  round: 1,
  at,
  ...fields,
});

const meta = preview.meta({
  title: 'Molecules/HistoryRow',
  component: HistoryRowCell,
  args: { entry: null, hp: 36, maxHp: 36 },
});

const rgb = (hex: string) => {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
};

const part = (canvasElement: HTMLElement, name: string) => {
  const element = canvasElement.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!element) throw new Error(`${name} not rendered`);
  return element;
};

const colorsOf = (canvasElement: HTMLElement) => {
  const chip = part(canvasElement, 'kind');
  const kind = getComputedStyle(chip);
  return {
    fill: kind.backgroundColor,
    text: kind.color,
    amount: getComputedStyle(part(canvasElement, 'amount')).color,
  };
};

export const Anatomy = meta.story({
  args: {
    entry: entry({ kind: 'damage', amount: 8, absorbed: 5, previous: 26, result: 23, round: 2 }),
    maxHp: 40,
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Round 2')).toBeVisible();
    await expect(part(canvasElement, 'kind')).toHaveTextContent('Damage');
    await expect(part(canvasElement, 'kind').tagName).toBe('SPAN');
    await expect(part(canvasElement, 'kind')).not.toHaveAttribute('data-condition');
    await expect(part(canvasElement, 'amount').textContent).toBe('−8 (5 temp)');
    await expect(part(canvasElement, 'result').textContent).toBe('23/40');
    const row = canvasElement.querySelector<HTMLElement>('[data-kind]');
    await expect(row?.getBoundingClientRect().height).toBe(40);
  },
});

export const Damage = meta.story({
  name: 'Damage',
  args: {
    entry: entry({ kind: 'damage', amount: 12, previous: 26, result: 14, round: 3 }),
    maxHp: 40,
  },
  play: async ({ canvasElement }) => {
    await expect(part(canvasElement, 'amount').textContent).toBe('−12');
    await expect(part(canvasElement, 'result').textContent).toBe('14/40');
    await expect(colorsOf(canvasElement)).toEqual({
      fill: rgb(conditions.vulnerable.fill),
      text: rgb(conditions.vulnerable.text),
      amount: rgb(hpActions.damage),
    });
  },
});

export const Heal = meta.story({
  name: 'Heal',
  args: {
    entry: entry({ kind: 'heal', amount: 3, previous: 23, result: 26, round: 3 }),
    maxHp: 40,
  },
  play: async ({ canvasElement }) => {
    await expect(part(canvasElement, 'amount').textContent).toBe('+3');
    await expect(part(canvasElement, 'result').textContent).toBe('26/40');
    await expect(colorsOf(canvasElement)).toEqual({
      fill: rgb(conditions.confused.fill),
      text: rgb(conditions.confused.text),
      amount: rgb(hpActions.heal),
    });
  },
});

export const Temp = meta.story({
  name: 'Temp',
  args: { entry: entry({ kind: 'temp', amount: 5, previous: 0, result: 26, round: 2 }), maxHp: 40 },
  play: async ({ canvasElement }) => {
    await expect(part(canvasElement, 'amount').textContent).toBe('+5 temp');
    await expect(part(canvasElement, 'result').textContent).toBe('26/40');
    await expect(colorsOf(canvasElement)).toEqual({
      fill: rgb(conditions.staggered.fill),
      text: rgb(conditions.staggered.text),
      amount: rgb(conditions.staggered.text),
    });
  },
});

export const Max = meta.story({
  name: 'Max',
  args: {
    entry: entry({ kind: 'max', amount: 40, previous: 45, result: 40, round: 1 }),
    maxHp: 45,
  },
  play: async ({ canvasElement }) => {
    await expect(part(canvasElement, 'amount').textContent).toBe('45 → 40');
    await expect(part(canvasElement, 'result').textContent).toBe('40/40');
    await expect(colorsOf(canvasElement)).toEqual({
      fill: rgb(conditions.fear.fill),
      text: rgb(conditions.fear.text),
      amount: rgb(base.ink),
    });
  },
});

export const NoKindStart = meta.story({
  name: 'No kind (start)',
  args: { entry: null, hp: 36, maxHp: 36 },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Start')).toBeVisible();
    await expect(canvasElement.querySelector('[data-part="kind"]')).toBeNull();
    await expect(part(canvasElement, 'result').textContent).toBe('36/36');
  },
});

export const DamageThroughTemp3Digits = meta.story({
  name: 'Damage through temp, 3 digits',
  args: {
    entry: entry({
      kind: 'damage',
      amount: 120,
      absorbed: 40,
      previous: 247,
      result: 167,
      round: 4,
    }),
    maxHp: 320,
  },
  play: async ({ canvasElement }) => {
    await expect(part(canvasElement, 'amount').textContent).toBe('−120 (40 temp)');
    await expect(part(canvasElement, 'result').textContent).toBe('167/320');
  },
});

export const BelowZero = meta.story({
  name: 'Below zero',
  args: {
    entry: entry({ kind: 'damage', amount: 400, previous: 287, result: -113, round: 1 }),
    maxHp: 320,
  },
  play: async ({ canvasElement }) => {
    await expect(part(canvasElement, 'amount').textContent).toBe('−400');
    await expect(part(canvasElement, 'result').textContent).toBe('−113/320');
  },
});

export const RuColumn84 = meta.story({
  name: 'ru, column 84',
  globals: { locale: 'ru' },
  args: {
    entry: entry({ kind: 'damage', amount: 8, absorbed: 5, previous: 26, result: 23, round: 2 }),
    maxHp: 40,
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(part(canvasElement, 'kind')).toHaveTextContent('Урон');
    await expect(part(canvasElement, 'amount').textContent).toBe('−8 (5 врем.)');
    const kindLeft = part(canvasElement, 'kind').getBoundingClientRect().left;
    await expect(kindLeft - canvas.getByText('Раунд 2').getBoundingClientRect().left).toBe(92);
  },
});

export const JaColumn84 = meta.story({
  name: 'ja, column 84',
  globals: { locale: 'ja' },
  args: {
    entry: entry({ kind: 'heal', amount: 3, previous: 23, result: 26, round: 3 }),
    maxHp: 40,
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('ラウンド 3')).toBeVisible();
    await expect(part(canvasElement, 'kind')).toHaveTextContent('回復');
    await expect(part(canvasElement, 'result').textContent).toBe('26/40');
  },
});

export const ExtraSetupRound = meta.story({
  name: 'Entry made in setup reads Start',
  args: {
    entry: entry({ kind: 'damage', amount: 4, previous: 36, result: 32, round: null }),
    maxHp: 36,
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Start')).toBeVisible();
    await expect(part(canvasElement, 'amount').textContent).toBe('−4');
  },
});
