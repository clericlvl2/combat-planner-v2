import type { HpHistoryEntry } from '@combat-planner/domain';
import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { base, historyTemp, hpActions } from '../../theme.ts';
import { HistoryRow } from './HistoryRow.tsx';
import type { HistoryRowProps } from './HistoryRow.tsx';
import { storyT } from '../../storybook/storyT.ts';

function HistoryRowCell(props: HistoryRowProps) {
  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: '100%',
        padding: '0 12px',
        background: base.surface,
      }}
    >
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

const amountColor = (canvasElement: HTMLElement) =>
  getComputedStyle(part(canvasElement, 'amount')).color;

const rowsOf = (canvasElement: HTMLElement) =>
  canvasElement.querySelectorAll<HTMLElement>('[data-history-row]');

const rowAt = (canvasElement: HTMLElement, index: number) => {
  const element = rowsOf(canvasElement)[index];
  if (!element) throw new Error(`row ${index} not rendered`);
  return element;
};

function HistoryRowList({ rows }: { rows: readonly HistoryRowProps[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows.map((row, index) => (
        <div key={index} data-history-row="">
          <HistoryRowCell {...row} />
        </div>
      ))}
    </div>
  );
}

const allKinds: readonly HistoryRowProps[] = [
  { entry: entry({ kind: 'damage', amount: 12, previous: 26, result: 14, round: 3 }), maxHp: 40 },
  { entry: entry({ kind: 'heal', amount: 3, previous: 23, result: 26, round: 3 }), maxHp: 40 },
  { entry: entry({ kind: 'temp', amount: 5, previous: 0, result: 26, round: 2 }), maxHp: 40 },
  { entry: entry({ kind: 'max', amount: 40, previous: 45, result: 40, round: 1 }), maxHp: 45 },
  { entry: entry({ kind: 'max', amount: 50, previous: 40, result: 40, round: 1 }), maxHp: 40 },
  { entry: null, hp: 36, maxHp: 36 },
  { entry: entry({ kind: 'damage', amount: 7, previous: 21, result: 14, round: 99 }), maxHp: 40 },
];

const largeValues: readonly HistoryRowProps[] = [
  {
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
  {
    entry: entry({ kind: 'damage', amount: 400, previous: 287, result: -113, round: 1 }),
    maxHp: 320,
  },
];

export const DamageThroughTempHp = meta.story({
  tags: ['visual'],
  args: {
    entry: entry({ kind: 'damage', amount: 8, absorbed: 5, previous: 26, result: 23, round: 2 }),
    maxHp: 40,
  },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HistoryRow');
    await expect(part(canvasElement, 'kind')).toHaveTextContent(t('damage'));
    await expect(part(canvasElement, 'when').textContent).toBe(
      `${t('round', { round: 2 })} ${t('absorbed', { amount: 5 })}`,
    );
    await expect(part(canvasElement, 'amount').textContent).toBe('−8');
    await expect(part(canvasElement, 'result').textContent).toBe('23/40');
    const kind = part(canvasElement, 'kind').getBoundingClientRect();
    const when = part(canvasElement, 'when').getBoundingClientRect();
    await expect(when.top).toBeGreaterThanOrEqual(kind.bottom);
    const row = canvasElement.querySelector<HTMLElement>('[data-kind]');
    await expect(row?.getBoundingClientRect().height).toBe(52);
  },
});

export const AllKinds = meta.story({
  render: () => <HistoryRowList rows={allKinds} />,
  play: async ({ canvasElement }) => {
    await expect(rowsOf(canvasElement)).toHaveLength(allKinds.length);
  },
});

export const LargeValues = meta.story({
  render: () => <HistoryRowList rows={largeValues} />,
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HistoryRow');
    const throughTemp = rowAt(canvasElement, 0);
    const belowZero = rowAt(canvasElement, 1);
    await expect(part(throughTemp, 'amount').textContent).toBe('−120');
    await expect(part(throughTemp, 'absorbed').textContent).toBe(
      ` ${t('absorbed', { amount: 40 })}`,
    );
    await expect(part(throughTemp, 'result').textContent).toBe('167/320');
    await expect(part(belowZero, 'amount').textContent).toBe('−400');
    await expect(part(belowZero, 'result').textContent).toBe('−113/320');
  },
});

export const KindFacts = meta.story({
  tags: ['!dev'],
  render: () => <HistoryRowList rows={allKinds} />,
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HistoryRow');
    const damage = rowAt(canvasElement, 0);
    const heal = rowAt(canvasElement, 1);
    const temp = rowAt(canvasElement, 2);
    const maxLowered = rowAt(canvasElement, 3);
    const maxRaised = rowAt(canvasElement, 4);
    const start = rowAt(canvasElement, 5);
    const lastRound = rowAt(canvasElement, 6);
    await expect(part(damage, 'amount').textContent).toBe('−12');
    await expect(part(damage, 'kind').textContent).toBe(t('damage'));
    await expect(part(damage, 'result').textContent).toBe('14/40');
    await expect(amountColor(damage)).toBe(rgb(hpActions.damage));
    await expect(part(heal, 'amount').textContent).toBe('+3');
    await expect(part(heal, 'kind').textContent).toBe(t('heal'));
    await expect(part(heal, 'result').textContent).toBe('26/40');
    await expect(amountColor(heal)).toBe(rgb(hpActions.heal));
    await expect(part(temp, 'amount').textContent).toBe('+5');
    await expect(part(temp, 'kind').textContent).toBe(t('temp'));
    await expect(part(temp, 'result').textContent).toBe('26/40');
    await expect(amountColor(temp)).toBe(rgb(historyTemp.text));
    await expect(part(maxLowered, 'amount').textContent).toBe('40');
    await expect(part(maxLowered, 'kind').textContent).toBe(t('max'));
    await expect(part(maxLowered, 'result').textContent).toBe('40/40');
    await expect(amountColor(maxLowered)).toBe(rgb(hpActions.max));
    await expect(part(maxRaised, 'amount').textContent).toBe('50');
    await expect(part(maxRaised, 'result').textContent).toBe('40/50');
    await expect(start).toHaveTextContent(t('start'));
    await expect(start.querySelector('[data-part="kind"]')).toBeNull();
    await expect(part(start, 'result').textContent).toBe('36/36');
    await expect(lastRound).toHaveTextContent(t('round', { round: 99 }));
  },
});

export const SetupEntryReadsStart = meta.story({
  tags: ['!dev'],
  args: {
    entry: entry({ kind: 'damage', amount: 4, previous: 36, result: 32, round: null }),
    maxHp: 36,
  },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HistoryRow');
    await expect(canvas.getByText(t('start'))).toBeVisible();
    await expect(part(canvasElement, 'amount').textContent).toBe('−4');
  },
});

export const ResultShowsMaxAtEntry = meta.story({
  tags: ['!dev'],
  args: {
    entry: entry({ kind: 'damage', amount: 6, previous: 40, result: 34, max: 40, round: 2 }),
    maxHp: 30,
  },
  play: async ({ canvasElement }) => {
    await expect(part(canvasElement, 'result').textContent).toBe('34/40');
  },
});
