import preview from '#.storybook/preview';
import { CONDITIONS } from '@combat-planner/domain';
import type { Condition } from '@combat-planner/domain';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { ConditionPicker } from './ConditionPicker.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { storyLocale } from '../../storybook/withLocale.tsx';

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

export const Default = meta.story({
  tags: ['visual'],
  args: { initial: ['dazed', 'hampered'] },
});

export const NothingSelected = meta.story({});

export const AllSelected = meta.story({
  args: { initial: CONDITIONS },
});

export const LongUnitName = meta.story({
  tags: ['visual'],
  args: { initial: ['stuck'], unitName: 'Brother Tomas of the Silver Lantern Order' },
});

export const TapAppliesAtOnce = meta.story({
  tags: ['!dev'],
  args: { initial: ['dazed', 'hampered'] },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'ConditionPicker');
    const weakened = canvas.getByRole('checkbox', { name: t('weakened') });
    await expect(weakened).not.toBeChecked();
    await userEvent.click(weakened);
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith(['dazed', 'hampered', 'weakened']);
    await expect(weakened).toBeChecked();
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(canvas.getByRole('dialog', { name: t('title') })).toBeVisible();
    await userEvent.click(canvas.getByRole('checkbox', { name: t('dazed') }));
    await expect(args.onChange).toHaveBeenLastCalledWith(['hampered', 'weakened']);
  },
});

export const DoneCloses = meta.story({
  tags: ['!dev'],
  args: { initial: ['dazed'] },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'ConditionPicker');
    await userEvent.click(canvas.getByRole('button', { name: t('done') }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const SortedDownColumns = meta.story({
  tags: ['!dev'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'ConditionPicker');
    const group = canvas.getByRole('group', { name: t('title') });
    const boxes = within(group).getAllByRole('checkbox');
    const labels = boxes.map((box) => box.closest('label')?.textContent ?? '');
    await expect(labels).toEqual(
      [...labels].sort((a, b) => a.localeCompare(b, storyLocale(globals))),
    );
    const boxRects = boxes.map((box) => box.getBoundingClientRect());
    const columnMajor = [...boxRects].sort((a, b) => a.left - b.left || a.top - b.top);
    await expect(boxRects).toEqual(columnMajor);
    await expect(boxRects[5]?.left).toBe(boxRects[0]?.left);
    await expect(boxRects[5]?.top).toBeGreaterThan(boxRects[0]?.top ?? 0);
  },
});
