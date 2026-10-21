import preview from '#.storybook/preview';
import type { HpHistoryEntry, HpHistoryKind } from '@combat-planner/domain';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { HpHistory } from './HpHistory.tsx';
import { storyT } from '../../storybook/storyT.ts';

type Variant = 'inline' | 'sheet';

interface HpHistoryCellProps {
  variant?: Variant;
  entries?: readonly HpHistoryEntry[];
  maxHp?: number;
  unitName?: string;
  expanded?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

const at = '2026-10-15T18:00:00.000Z';

const entry = (
  round: number | null,
  kind: HpHistoryKind,
  amount: number,
  result: number,
  previous: number,
  absorbed = 0,
): HpHistoryEntry => ({ kind, amount, absorbed, previous, result, round, at });

const short = [
  entry(3, 'damage', 7, 20, 27),
  entry(2, 'damage', 9, 27, 36),
  entry(1, 'max', 36, 36, 32),
];

const full = [
  entry(3, 'damage', 12, 14, 26),
  entry(3, 'heal', 3, 26, 23),
  entry(2, 'damage', 8, 23, 26, 5),
  entry(2, 'temp', 5, 26, 0),
  entry(1, 'damage', 14, 26, 40),
  entry(1, 'max', 40, 40, 45),
];

const long = [
  ...full,
  entry(null, 'damage', 3, 42, 45),
  entry(null, 'heal', 3, 45, 42),
  entry(null, 'damage', 6, 39, 45),
  entry(null, 'max', 45, 45, 40),
];

const threeDigit = [
  entry(4, 'damage', 120, 167, 247, 40),
  entry(3, 'heal', 105, 287, 182),
  entry(2, 'max', 999, 999, 320),
  entry(1, 'damage', 400, -113, 287),
];

const sheetStage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

const reopen: CSSProperties = { margin: '60px 16px', font: 'inherit' };

function HpHistoryCell({
  variant = 'inline',
  entries = full,
  maxHp = 40,
  unitName = 'Orc Berserker',
  expanded: initiallyExpanded = false,
  onToggle,
  onClose,
}: HpHistoryCellProps) {
  const { t } = useTranslation('HpHistory');
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [opened, setOpened] = useState(true);
  if (variant === 'sheet') {
    return (
      <div style={sheetStage}>
        {opened ? null : (
          <button
            type="button"
            data-story-fixture=""
            style={reopen}
            onClick={() => setOpened(true)}
          >
            {t('title')}
          </button>
        )}
        <HpHistory
          variant="sheet"
          entries={entries}
          maxHp={maxHp}
          unitName={unitName}
          opened={opened}
          onClose={() => {
            setOpened(false);
            onClose?.();
          }}
        />
      </div>
    );
  }
  return (
    <div style={{ width: 334 }}>
      <HpHistory
        variant="inline"
        entries={entries}
        maxHp={maxHp}
        expanded={expanded}
        onToggle={() => {
          setExpanded((value) => !value);
          onToggle?.();
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/HpHistory',
  component: HpHistoryCell,
  args: { onToggle: fn(), onClose: fn() },
});

const sheet = { phoneFrame: { overlay: true } };

const rowTexts = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[role="listitem"]')].map((row) =>
    [...row.children].map((part) => part.textContent).join(' '),
  );

const collapseShowsCount = async (
  canvasElement: HTMLElement,
  title: string,
  count: string,
  onToggle: unknown,
) => {
  const canvas = within(canvasElement);
  const header = canvas.getByRole('button', { name: title });
  await userEvent.click(header);
  await expect(onToggle).toHaveBeenCalledOnce();
  await expect(header).toHaveAttribute('aria-expanded', 'false');
  await expect(canvas.getByText(count)).toBeVisible();
  await userEvent.click(header);
  await expect(header).toHaveAttribute('aria-expanded', 'true');
  await expect(canvas.queryByText(count)).toBeNull();
  header.blur();
  await expect(header).not.toHaveFocus();
};

export const Expanded = meta.story({
  tags: ['visual'],
  args: { expanded: true },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HpHistory');
    await expect(canvas.getByRole('button', { name: t('title') })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(rowTexts(canvasElement)).toEqual([
      `${t('HistoryRow:round', { round: 3 })} ${t('HistoryRow:damage')}−12 14/40`,
      `${t('HistoryRow:round', { round: 3 })} ${t('HistoryRow:heal')}+3 26/40`,
      `${t('HistoryRow:round', { round: 2 })} ${t('HistoryRow:damage')}−8 ${t('HistoryRow:absorbed', { amount: 5 })} 23/40`,
      `${t('HistoryRow:round', { round: 2 })} ${t('HistoryRow:temp')}${t('HistoryRow:tempAmount', { amount: 5 })} 26/40`,
      `${t('HistoryRow:round', { round: 1 })} ${t('HistoryRow:damage')}−14 26/40`,
      `${t('HistoryRow:round', { round: 1 })} ${t('HistoryRow:max')}45 → 40 40/40`,
    ]);
  },
});

export const Collapsed = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'HpHistory');
    await expect(
      canvas.getByRole('button', { name: `${t('title')} ${t('count', { count: 6 })}` }),
    ).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByText(`${t('count', { count: 6 })}`)).toBeVisible();
    await expect(canvas.queryByRole('list')).toBeNull();
  },
});

export const CollapsedNoChanges = meta.story({
  args: { entries: [] },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'HpHistory');
    await expect(canvas.queryByText(t('count', { count: 0 }))).toBeNull();
  },
});

export const ExpandedNoChanges = meta.story({
  args: { expanded: true, entries: [] },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'HpHistory');
    await expect(canvas.getByText(t('empty'))).toBeVisible();
    await expect(canvas.queryByRole('listitem')).toBeNull();
  },
});

export const ExpandedLongList = meta.story({
  tags: ['visual'],
  args: { expanded: true, entries: long },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HpHistory');
    const list = canvas.getByRole('list', { name: t('title') });
    await expect(canvas.getAllByRole('listitem')).toHaveLength(10);
    await expect(list.clientHeight).toBe(248);
    await expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
    await expect(list).toHaveAttribute('tabindex', '0');
    await expect(canvasElement.querySelector('[data-fade]')).not.toBeNull();
  },
});

export const ThreeDigitValues = meta.story({
  args: { expanded: true, entries: threeDigit, maxHp: 320 },
  play: async ({ args, canvasElement, globals }) => {
    const t = storyT(globals, 'HpHistory');
    await expect(rowTexts(canvasElement)).toEqual([
      `${t('HistoryRow:round', { round: 4 })} ${t('HistoryRow:damage')}−120 ${t('HistoryRow:absorbed', { amount: 40 })} 167/320`,
      `${t('HistoryRow:round', { round: 3 })} ${t('HistoryRow:heal')}+105 287/320`,
      `${t('HistoryRow:round', { round: 2 })} ${t('HistoryRow:max')}320 → 999 999/999`,
      `${t('HistoryRow:round', { round: 1 })} ${t('HistoryRow:damage')}−400 −113/320`,
    ]);
    await expect(
      within(canvasElement).queryByText(`Orc Berserker · ${t('count', { count: 4 })}`),
    ).toBeNull();
    await collapseShowsCount(
      canvasElement,
      t('title'),
      `${t('count', { count: 4 })}`,
      args.onToggle,
    );
  },
});

export const Sheet = meta.story({
  parameters: sheet,
  args: { variant: 'sheet' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'HpHistory');
    await expect(
      await canvas.findByText(`Orc Berserker · ${t('count', { count: 6 })}`),
    ).toBeVisible();
    await expect(canvas.getAllByRole('listitem')).toHaveLength(6);
  },
});

export const SheetNoChanges = meta.story({
  parameters: sheet,
  args: { variant: 'sheet', entries: [] },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'HpHistory');
    await expect(await canvas.findByText(`Orc Berserker · ${t('empty')}`)).toBeVisible();
    await expect(canvas.getByText(t('empty'))).toBeVisible();
    await expect(canvas.queryByRole('listitem')).toBeNull();
  },
});

export const SheetLongList = meta.story({
  parameters: sheet,
  args: { variant: 'sheet', entries: long },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'HpHistory');
    await expect(
      await canvas.findByText(`Orc Berserker · ${t('count', { count: 10 })}`),
    ).toBeVisible();
    await expect(canvas.getAllByRole('listitem')).toHaveLength(10);
  },
});

export const HeaderTapToggles = meta.story({
  tags: ['!dev'],
  args: { entries: short, maxHp: 36 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'HpHistory');
    const header = canvas.getByRole('button', {
      name: `${t('title')} ${t('count', { count: 3 })}`,
    });
    await expect(canvas.getByText(`${t('count', { count: 3 })}`)).toBeVisible();
    await userEvent.click(header);
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(header).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3);
    await userEvent.click(header);
    await expect(args.onToggle).toHaveBeenCalledTimes(2);
    await expect(canvas.queryByRole('list')).toBeNull();
    header.blur();
    header.setAttribute('data-tap', '');
    await expect(header).toHaveAttribute('data-tap');
  },
});

export const HeaderKeysToggle = meta.story({
  tags: ['!dev'],
  args: { entries: short, maxHp: 36 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'HpHistory');
    const header = canvas.getByRole('button', {
      name: `${t('title')} ${t('count', { count: 3 })}`,
    });
    await userEvent.tab();
    await expect(header).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(header).toHaveAttribute('aria-expanded', 'true');
    await expect(header).toHaveAttribute('aria-controls');
    await userEvent.keyboard('[Space]');
    await expect(args.onToggle).toHaveBeenCalledTimes(2);
    await expect(header).toHaveAttribute('aria-expanded', 'false');
  },
});

export const RowsInGivenOrder = meta.story({
  tags: ['!dev'],
  args: { expanded: true, entries: [...short].reverse(), maxHp: 36 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpHistory');
    await expect(rowTexts(canvasElement)).toEqual([
      `${t('HistoryRow:round', { round: 1 })} ${t('HistoryRow:max')}32 → 36 36/36`,
      `${t('HistoryRow:round', { round: 2 })} ${t('HistoryRow:damage')}−9 27/36`,
      `${t('HistoryRow:round', { round: 3 })} ${t('HistoryRow:damage')}−7 20/36`,
    ]);
  },
});

export const RowsReadOnly = meta.story({
  tags: ['!dev'],
  args: { expanded: true, entries: short, maxHp: 36 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'HpHistory');
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    for (const row of canvas.getAllByRole('listitem')) await userEvent.click(row);
    await expect(args.onToggle).not.toHaveBeenCalled();
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(canvas.getByRole('button', { name: t('title') })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  },
});

export const LongListScrollsByKeyboard = meta.story({
  tags: ['!dev'],
  parameters: {
    geometry: {
      tapTargets: {
        reason: 'the HP History opener is a story fixture, not product UI',
        except: '[data-story-fixture]',
      },
    },
    ...sheet,
    motion: 'on',
  },
  args: { variant: 'sheet', entries: [...long, ...long] },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'HpHistory');
    const dialog = await canvas.findByRole('dialog', { name: t('title') });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    const close = within(dialog).getByRole('button', { name: t('Sheet:close') });
    const list = within(dialog).getByRole('list', { name: t('title') });
    await userEvent.tab();
    await expect(close).toHaveFocus();
    await userEvent.tab();
    await expect(list).toHaveFocus();
    await userEvent.tab();
    await expect(close).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(list).toHaveFocus();
    await expect(list.scrollTop).toBe(0);
    const rowHeight = within(list).getAllByRole('listitem')[0]?.offsetHeight ?? 0;
    await userEvent.keyboard('{PageDown}');
    await waitFor(() => expect(list.scrollTop).toBeGreaterThan(0));
    await expect(rowHeight).toBeGreaterThan(0);
    await expect(list.clientHeight - rowHeight).toBeLessThan(list.scrollHeight - list.clientHeight);
    await expect(list.scrollTop).toBe(list.clientHeight - rowHeight);
    await userEvent.keyboard('{PageUp}');
    await expect(list.scrollTop).toBe(0);
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});
