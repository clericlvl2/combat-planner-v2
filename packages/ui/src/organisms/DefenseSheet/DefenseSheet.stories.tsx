import preview from '#.storybook/preview';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { hpActions, interaction } from '../../theme.ts';
import { DefenseSheet } from './DefenseSheet.tsx';
import type { DefenseMods } from './DefenseSheet.tsx';
import { storyT } from '../../storybook/storyT.ts';

interface DefenseSheetCellProps {
  unitName?: string;
  base?: DefenseMods;
  initial?: DefenseMods;
  onChange?: (mods: DefenseMods) => void;
  onClose?: () => void;
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

function DefenseSheetCell({
  unitName = 'Orc Berserker',
  base = { ac: 18, pd: 18, md: 18 },
  initial = { ac: 0, pd: 0, md: 0 },
  onChange,
  onClose,
}: DefenseSheetCellProps) {
  const [mods, setMods] = useState(initial);
  const [opened, setOpened] = useState(true);
  return (
    <div style={stage}>
      <DefenseSheet
        opened={opened}
        unitName={unitName}
        base={base}
        mods={mods}
        onChange={(next) => {
          setMods(next);
          onChange?.(next);
        }}
        onClose={() => {
          setOpened(false);
          onClose?.();
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/DefenseSheet',
  component: DefenseSheetCell,
  parameters: { phoneFrame: { overlay: true } },
  args: { onChange: fn(), onClose: fn() },
});

const rgb = (hex: string) => {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
};

const rowOf = (canvasElement: HTMLElement, stat: string): HTMLElement => {
  const row = canvasElement.ownerDocument.querySelector<HTMLElement>(`[data-stat="${stat}"]`);
  if (!row) throw new Error(`row ${stat} not rendered`);
  return row;
};

export const Default = meta.story({
  tags: ['visual'],
});

export const WithModifiers = meta.story({
  tags: ['visual'],
  args: { initial: { ac: 2, pd: -1, md: 0 } },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'DefenseSheet');
    await expect(
      canvas.getByRole('dialog', { name: t('title', { name: 'Orc Berserker' }) }),
    ).toBeVisible();
    const ac = rowOf(canvasElement, 'ac');
    const pd = rowOf(canvasElement, 'pd');
    await expect(within(ac).getByText('20')).toBeVisible();
    await expect(within(pd).getByText('17')).toBeVisible();
    await expect(within(ac).getByText(t('base', { value: 18 }))).toBeVisible();
    await expect(getComputedStyle(within(ac).getByText('20')).color).toBe(rgb(hpActions.healText));
    await expect(getComputedStyle(within(pd).getByText('17')).color).toBe(
      rgb(interaction.dangerText),
    );
    await expect(within(ac).getByRole('spinbutton')).toHaveValue('+2');
    await expect(within(pd).getByRole('spinbutton')).toHaveValue('−1');
  },
});

export const StepperDispatches = meta.story({
  tags: ['!dev'],
  args: { initial: { ac: 2, pd: 0, md: 0 } },
  play: async ({ args, canvasElement, globals }) => {
    const t = storyT(globals, 'Stepper');
    const md = within(rowOf(canvasElement, 'md'));
    await userEvent.click(md.getByRole('button', { name: t('decrease') }));
    await expect(args.onChange).toHaveBeenLastCalledWith({ ac: 2, pd: 0, md: -1 });
    await userEvent.click(md.getByRole('button', { name: t('decrease') }));
    await expect(args.onChange).toHaveBeenLastCalledWith({ ac: 2, pd: 0, md: -2 });
    await expect(md.getByText('16')).toBeVisible();
    await expect(args.onChange).toHaveBeenCalledTimes(2);
    await expect(args.onClose).not.toHaveBeenCalled();
  },
});

export const ResetClearsAll = meta.story({
  tags: ['!dev'],
  args: { initial: { ac: 2, pd: -1, md: 3 } },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'DefenseSheet');
    const reset = canvas.getByRole('button', { name: t('reset') });
    await expect(reset).toBeEnabled();
    await userEvent.click(reset);
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith({ ac: 0, pd: 0, md: 0 });
    await expect(reset).toBeDisabled();
    await expect(canvas.getAllByText('18')).toHaveLength(3);
  },
});
