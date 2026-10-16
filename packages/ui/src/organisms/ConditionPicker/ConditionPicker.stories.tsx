import preview from '#.storybook/preview';
import { CONDITIONS } from '@combat-planner/domain';
import type { Condition } from '@combat-planner/domain';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { ConditionPicker } from './ConditionPicker.tsx';

interface ConditionPickerCellProps {
  unitName?: string;
  initial?: readonly Condition[];
  onChange?: (value: Condition[]) => void;
  onClose?: () => void;
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

function ConditionPickerCell({
  unitName = 'Vashti the Hexer',
  initial = [],
  onChange,
  onClose,
}: ConditionPickerCellProps) {
  const [value, setValue] = useState<Condition[]>([...initial]);
  const [opened, setOpened] = useState(true);
  return (
    <div style={stage}>
      <ConditionPicker
        opened={opened}
        unitName={unitName}
        value={value}
        onChange={(next) => {
          setValue(next);
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
  title: 'Organisms/ConditionPicker',
  component: ConditionPickerCell,
  parameters: { phoneFrame: { overlay: true } },
  args: { onChange: fn(), onClose: fn() },
});

const markTap = async (canvasElement: HTMLElement, condition: Condition) => {
  const row = await waitFor(() => {
    const found = canvasElement.querySelector(`label[data-condition="${condition}"]`);
    if (!found) throw new Error(`row ${condition} not rendered`);
    return found;
  });
  row.setAttribute('data-tap', '');
  await expect(row).toHaveAttribute('data-tap');
};

export const Anatomy = meta.story({
  args: { initial: ['dazed', 'staggered'] },
});

export const NothingSelected = meta.story({
  name: 'Nothing selected',
});

export const TwoSelected = meta.story({
  name: 'Two selected',
  args: { initial: ['dazed', 'staggered'] },
});

export const TapAddingWeakened = meta.story({
  name: 'Tap: adding weakened',
  args: { initial: ['dazed', 'staggered'] },
  play: async ({ canvas, canvasElement }) => {
    await markTap(canvasElement, 'weakened');
    await expect(canvas.getByRole('checkbox', { name: 'weakened' })).not.toBeChecked();
  },
});

export const AllSelected = meta.story({
  name: 'All selected',
  args: { initial: CONDITIONS },
});

export const LongUnitName = meta.story({
  name: 'Long unit name',
  args: { initial: ['stuck'], unitName: 'Brother Tomas of the Silver Lantern Order' },
});

export const ExtraFlowTapWeakened = meta.story({
  name: 'Flow: tap weakened applies at once',
  args: { initial: ['dazed', 'staggered'] },
  play: async ({ args, canvas }) => {
    const weakened = canvas.getByRole('checkbox', { name: 'weakened' });
    await expect(weakened).not.toBeChecked();
    await userEvent.click(weakened);
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith(['dazed', 'staggered', 'weakened']);
    await expect(weakened).toBeChecked();
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(canvas.getByRole('dialog', { name: 'Conditions' })).toBeVisible();
    await userEvent.click(canvas.getByRole('checkbox', { name: 'dazed' }));
    await expect(args.onChange).toHaveBeenLastCalledWith(['staggered', 'weakened']);
  },
});

export const ExtraDoneCloses = meta.story({
  name: 'Done closes without a change',
  args: { initial: ['dazed'] },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Done' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraCloseButton = meta.story({
  name: 'Close button closes without a change',
  args: { initial: ['dazed'] },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Space toggles the focused row, Escape closes',
  play: async ({ args, canvas }) => {
    const dialog = canvas.getByRole('dialog');
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    const charmed = canvas.getByRole('checkbox', { name: 'charmed' });
    charmed.focus();
    await userEvent.keyboard(' ');
    await expect(args.onChange).toHaveBeenCalledWith(['charmed']);
    await userEvent.tab();
    await expect(canvas.getByRole('checkbox', { name: 'confused' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
});

export const ExtraOrderAZ = meta.story({
  name: 'A–Z down the first column',
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Conditions' });
    const boxes = within(group).getAllByRole('checkbox');
    const labels = boxes.map((box) => box.closest('label')?.textContent ?? '');
    await expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'en')));
    const first = boxes[0]?.getBoundingClientRect();
    const sixth = boxes[5]?.getBoundingClientRect();
    const seventh = boxes[6]?.getBoundingClientRect();
    await expect(sixth?.left).toBe(first?.left);
    await expect(sixth?.top).toBeGreaterThan(first?.top ?? 0);
    await expect(seventh?.top).toBe(first?.top);
    await expect(seventh?.left).toBeGreaterThan(first?.left ?? 0);
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru sorts А–Я',
  globals: { locale: 'ru' },
  args: { initial: ['dazed', 'staggered'] },
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Состояния' });
    const labels = within(group)
      .getAllByRole('checkbox')
      .map((box) => box.closest('label')?.textContent ?? '');
    await expect(labels[0]).toBe('беспомощен');
    await expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'ru')));
    await expect(canvas.getByRole('checkbox', { name: 'ошеломлён' })).toBeChecked();
    await expect(canvas.getByRole('button', { name: 'Готово' })).toBeVisible();
  },
});
