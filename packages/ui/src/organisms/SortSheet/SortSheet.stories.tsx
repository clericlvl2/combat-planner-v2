import preview from '#.storybook/preview';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
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

export const CombatsNewestFirst = meta.story({
  tags: ['visual'],
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

export const CombatsLastPlayed = meta.story({
  args: { context: 'combats', selected: 1 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    await expect(canvas.getByRole('radio', { name: t('lastPlayed') })).toBeChecked();
  },
});

export const LibraryNewestFirst = meta.story({
  tags: ['visual'],
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

export const LibraryByType = meta.story({
  args: { context: 'presets', selected: 2 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    await expect(canvas.getByRole('radio', { name: t('byType') })).toBeChecked();
  },
});

export const TapAlphabeticalAppliesAndCloses = meta.story({
  tags: ['!dev'],
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

export const DoneClosesWithoutChange = meta.story({
  tags: ['!dev'],
  args: { context: 'presets', selected: 2 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    await userEvent.click(canvas.getByRole('button', { name: t('done') }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const CurrentOptionDoesNotFire = meta.story({
  tags: ['!dev'],
  args: { context: 'combats', selected: 1 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SortSheet');
    await userEvent.click(canvas.getByText(t('lastPlayed')));
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByRole('radio', { name: t('lastPlayed') })).toBeChecked();
    await expect(canvas.getByRole('dialog', { name: t('sortCombats') })).toBeVisible();
  },
});

export const ArrowKeysApplyAndKeepSheet = meta.story({
  tags: ['!dev'],
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
