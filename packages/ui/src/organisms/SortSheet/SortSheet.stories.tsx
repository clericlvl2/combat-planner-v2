import preview from '#.storybook/preview';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { combatSorts, presetSorts, SortSheet } from './SortSheet.tsx';
import type { CombatSort, PresetSort, SortContext } from './SortSheet.tsx';
import { storyT } from '../../storybook/storyT.ts';

interface SortSheetCellProps {
  context?: SortContext;
  selected?: number;
  onChange?: (value: CombatSort | PresetSort) => void;
  onClose?: () => void;
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

function SortSheetCell({
  context = 'combats',
  selected = 0,
  onChange,
  onClose,
}: SortSheetCellProps) {
  const [combatValue, setCombatValue] = useState<CombatSort>(
    combatSorts[selected] ?? 'newestFirst',
  );
  const [presetValue, setPresetValue] = useState<PresetSort>(
    presetSorts[selected] ?? 'newestFirst',
  );
  const [opened, setOpened] = useState(true);
  const close = () => {
    setOpened(false);
    onClose?.();
  };
  return (
    <div style={stage}>
      {context === 'combats' ? (
        <SortSheet
          opened={opened}
          context="combats"
          value={combatValue}
          onChange={(next) => {
            setCombatValue(next);
            onChange?.(next);
          }}
          onClose={close}
        />
      ) : (
        <SortSheet
          opened={opened}
          context="presets"
          value={presetValue}
          onChange={(next) => {
            setPresetValue(next);
            onChange?.(next);
          }}
          onClose={close}
        />
      )}
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/SortSheet',
  component: SortSheetCell,
  parameters: { phoneFrame: { overlay: true } },
  args: { onChange: fn(), onClose: fn() },
});

const markTap = async (canvasElement: HTMLElement, label: string) => {
  const row = await waitFor(() => {
    const rows = canvasElement.querySelectorAll<HTMLElement>('[role="radiogroup"] > *');
    const found = [...rows].find((candidate) => candidate.textContent === label);
    if (!found) throw new Error(`row ${label} not rendered`);
    return found;
  });
  row.setAttribute('data-tap', '');
  await expect(row).toHaveAttribute('data-tap');
  return row;
};

export const Anatomy = meta.story({
  tags: ['visual'],
  args: { context: 'combats', selected: 0 },
});

export const VariantsCombatListNewestFirst = meta.story({
  name: 'Variants: Combat list · Newest first',
  args: { context: 'combats', selected: 0 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    await expect(canvas.getByRole('dialog', { name: t('sortCombats') })).toBeVisible();
    const radios = canvas.getAllByRole('radio');
    await expect(radios.map((radio) => radio.closest('label')?.textContent)).toEqual([
      t('newestFirst'),
      t('lastPlayed'),
      t('alphabetical'),
    ]);
    await expect(canvas.getByRole('radio', { name: t('newestFirst') })).toBeChecked();
  },
});

export const LastPlayed = meta.story({
  name: 'Last played',
  args: { context: 'combats', selected: 1 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    await expect(canvas.getByRole('radio', { name: t('lastPlayed') })).toBeChecked();
  },
});

export const VariantsCombatListTapAZ = meta.story({
  name: 'Variants: Combat list · Tap A–Z',
  args: { context: 'combats', selected: 0 },
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'SortSheet');
    const row = await markTap(canvasElement, t('alphabetical'));
    await expect(within(row).getByRole('radio', { name: t('alphabetical') })).not.toBeChecked();
    await expect(canvas.getByRole('radio', { name: t('newestFirst') })).toBeChecked();
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const VariantsLibraryNewestFirst = meta.story({
  tags: ['visual'],
  name: 'Variants: Library · Newest first',
  args: { context: 'presets', selected: 0 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    await expect(canvas.getByRole('dialog', { name: t('sortPresets') })).toBeVisible();
    const radios = canvas.getAllByRole('radio');
    await expect(radios.map((radio) => radio.closest('label')?.textContent)).toEqual([
      t('newestFirst'),
      t('alphabetical'),
      t('byType'),
    ]);
  },
});

export const ByType = meta.story({
  name: 'By type',
  args: { context: 'presets', selected: 2 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    await expect(canvas.getByRole('radio', { name: t('byType') })).toBeChecked();
  },
});

export const VariantsLibraryTapAZ = meta.story({
  name: 'Variants: Library · Tap A–Z',
  args: { context: 'presets', selected: 0 },
  play: async ({ args, canvasElement, globals }) => {
    const t = storyT(globals, 'SortSheet');
    const row = await markTap(canvasElement, t('alphabetical'));
    await expect(within(row).getByRole('radio', { name: t('alphabetical') })).not.toBeChecked();
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const Ru = meta.story({
  name: 'ru',
  globals: { locale: 'ru' },
  args: { context: 'combats', selected: 1 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Сортировка боёв' })).toBeVisible();
    await expect(canvas.queryByRole('dialog', { name: 'Сортировка сражений' })).toBeNull();
    await expect(canvas.getByRole('radio', { name: 'Последняя игра' })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: 'Сначала новые' })).not.toBeChecked();
    await expect(canvas.getByRole('radio', { name: 'А–Я' })).not.toBeChecked();
  },
});

export const De = meta.story({
  name: 'de',
  globals: { locale: 'de' },
  args: { context: 'combats', selected: 1 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Kämpfe sortieren' })).toBeVisible();
    await expect(canvas.getByRole('radio', { name: 'Zuletzt gespielt' })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: 'Neueste zuerst' })).not.toBeChecked();
  },
});

export const ExtraFlowTapAZ = meta.story({
  name: 'Flow: tap A–Z applies at once and closes',
  args: { context: 'combats', selected: 0 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    await userEvent.click(canvas.getByText(t('alphabetical')));
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('alphabetical');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraFlowLibraryByType = meta.story({
  name: 'Flow: Library, tap By type applies and closes',
  args: { context: 'presets', selected: 0 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    await userEvent.click(canvas.getByRole('radio', { name: t('byType') }));
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('byType');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraCloseWithoutChange = meta.story({
  name: 'Close button closes without a change',
  args: { context: 'combats', selected: 1 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:close') }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraDoneWithoutChange = meta.story({
  name: 'Done closes without a change',
  args: { context: 'presets', selected: 2 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    await userEvent.click(canvas.getByRole('button', { name: t('done') }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraCurrentOptionDoesNotFire = meta.story({
  name: 'Tap on the current option does not call onChange',
  args: { context: 'combats', selected: 1 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    await userEvent.click(canvas.getByText(t('lastPlayed')));
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByRole('radio', { name: t('lastPlayed') })).toBeChecked();
    await expect(canvas.getByRole('dialog', { name: t('sortCombats') })).toBeVisible();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: arrows apply and keep the sheet, Escape closes',
  args: { context: 'combats', selected: 0 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    const sheet = canvas.getByRole('dialog', { name: t('sortCombats') });
    await waitFor(() => expect(sheet).toContainElement(document.activeElement as HTMLElement));
    const newest = canvas.getByRole('radio', { name: t('newestFirst') });
    newest.focus();
    await expect(newest).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(args.onChange).toHaveBeenLastCalledWith('lastPlayed');
    await expect(canvas.getByRole('radio', { name: t('lastPlayed') })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(args.onChange).toHaveBeenLastCalledWith('alphabetical');
    await expect(args.onChange).toHaveBeenCalledTimes(2);
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(canvas.getByRole('radio', { name: t('alphabetical') })).toBeChecked();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraShiftTab = meta.story({
  name: 'Shift+Tab right after opening stays inside',
  args: { context: 'combats', selected: 0 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    const sheet = canvas.getByRole('dialog', { name: t('sortCombats') });
    await waitFor(() => expect(sheet).toContainElement(document.activeElement as HTMLElement));
    await userEvent.tab({ shift: true });
    await expect(sheet).toContainElement(document.activeElement as HTMLElement);
    await expect(canvas.getByRole('button', { name: t('done') })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: t('Sheet:close') })).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(canvas.getByRole('button', { name: t('done') })).toHaveFocus();
  },
});

export const ExtraShiftTabMotionOn = meta.story({
  name: 'Shift+Tab with motion on stays inside, Enter on Done closes',
  parameters: { motion: 'on' },
  args: { context: 'combats', selected: 0 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    const sheet = await canvas.findByRole('dialog', { name: t('sortCombats') });
    await waitFor(() => expect(sheet).toContainElement(document.activeElement as HTMLElement));
    await userEvent.tab({ shift: true });
    await expect(sheet).toContainElement(document.activeElement as HTMLElement);
    await userEvent.tab();
    await expect(sheet).toContainElement(document.activeElement as HTMLElement);
    const done = canvas.getByRole('button', { name: t('done') });
    done.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { context: 'presets', selected: 2 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'プリセットの並べ替え' })).toBeVisible();
    await expect(canvas.getByRole('radio', { name: '種類順' })).toBeChecked();
    await expect(canvas.getByRole('button', { name: '完了' })).toBeVisible();
  },
});
