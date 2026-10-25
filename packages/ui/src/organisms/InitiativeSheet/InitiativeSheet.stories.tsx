import preview from '#.storybook/preview';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { InitiativeSheet } from './InitiativeSheet.tsx';
import { storyT } from '../../storybook/storyT.ts';

interface InitiativeSheetCellProps {
  value?: number | null;
  bonus?: number;
  random?: () => number;
  onSet?: (value: number) => void;
  onRoll?: (initiative: number, roll: number) => void;
  onClose?: () => void;
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

function InitiativeSheetCell({
  value: initialValue = 15,
  bonus = 3,
  random,
  onSet,
  onRoll,
  onClose,
}: InitiativeSheetCellProps) {
  const [value, setValue] = useState(initialValue);
  const [opened, setOpened] = useState(true);
  return (
    <div style={stage}>
      <InitiativeSheet
        opened={opened}
        value={value}
        bonus={bonus}
        random={random}
        onSet={(next) => {
          setValue(next);
          onSet?.(next);
        }}
        onRoll={(initiative, roll) => onRoll?.(initiative, roll)}
        onClose={() => {
          setOpened(false);
          onClose?.();
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/InitiativeSheet',
  component: InitiativeSheetCell,
  parameters: { phoneFrame: { overlay: true } },
  args: { onSet: fn(), onRoll: fn(), onClose: fn() },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'InitiativeSheet');
    const sheet = await canvas.findByRole('dialog', { name: t('title') });
    await expect(sheet).toBeVisible();
    await expect(within(sheet).getByText('(+3)')).toBeVisible();
    await expect(within(sheet).queryByRole('heading')).toBeNull();
    await expect(canvas.getByRole('spinbutton')).toHaveValue('15');
    const roll = canvas.getByRole('button', { name: t('roll', { bonus: '+3' }) });
    await expect(roll).toBeVisible();
    await expect(roll.querySelector('svg')).not.toBeNull();
  },
});

export const NoInitiativeYet = meta.story({
  tags: ['visual'],
  args: { value: null },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'InitiativeSheet');
    await canvas.findByRole('dialog', { name: t('title') });
    await expect(canvas.getByRole('spinbutton')).toHaveValue('—');
  },
});

export const NegativeBonusInRollLabel = meta.story({
  tags: ['!dev'],
  args: { bonus: -2 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'InitiativeSheet');
    await expect(
      await canvas.findByRole('button', { name: t('roll', { bonus: '−2' }) }),
    ).toBeVisible();
  },
});

export const MinusAndPlusSetTheValue = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Stepper');
    await userEvent.click(await canvas.findByRole('button', { name: t('increase') }));
    await expect(args.onSet).toHaveBeenLastCalledWith(16);
    await userEvent.click(canvas.getByRole('button', { name: t('decrease') }));
    await userEvent.click(canvas.getByRole('button', { name: t('decrease') }));
    await expect(args.onSet).toHaveBeenLastCalledWith(14);
    await expect(args.onSet).toHaveBeenCalledTimes(3);
    await expect(canvas.getByRole('spinbutton')).toHaveValue('14');
    await expect(args.onRoll).not.toHaveBeenCalled();
  },
});

export const RollAddsTheBonus = meta.story({
  tags: ['!dev'],
  args: { random: () => 0.5 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'InitiativeSheet');
    await userEvent.click(await canvas.findByRole('button', { name: t('roll', { bonus: '+3' }) }));
    await expect(args.onRoll).toHaveBeenCalledOnce();
    await expect(args.onRoll).toHaveBeenCalledWith(14, 11);
    await expect(args.onSet).not.toHaveBeenCalled();
  },
});
