import preview from '#.storybook/preview';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { InitiativeSheet } from './InitiativeSheet.tsx';
import { layout } from '../../layout.ts';
import { storyT } from '../../storybook/storyT.ts';

interface InitiativeSheetCellProps {
  unitName?: string;
  value?: number | null;
  bonus?: number;
  random?: () => number;
  onSet?: (value: number) => void;
  onRoll?: (initiative: number, roll: number) => void;
  onClose?: () => void;
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

function InitiativeSheetCell({
  unitName = 'Orc Berserker',
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
        unitName={unitName}
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
    const sheet = await canvas.findByRole('dialog', { name: 'Orc Berserker' });
    await expect(sheet).toBeVisible();
    await expect(within(sheet).getByRole('heading', { name: 'Orc Berserker' })).toBeVisible();
    await expect(canvas.getByRole('spinbutton', { name: t('title') })).toHaveValue('15');
    const roll = canvas.getByRole('button', { name: t('roll', { bonus: '+3' }) });
    await expect(roll).toBeVisible();
    await expect(roll).toHaveAttribute('data-sheet-action');
    await expect(roll).toHaveTextContent('+3');
    await expect(roll.querySelector('svg')).not.toBeNull();
    const stepper = canvas.getByRole('spinbutton', { name: t('title') }).getBoundingClientRect();
    const box = roll.getBoundingClientRect();
    await expect(box.width).toBe(layout.control.M);
    await expect(box.height).toBe(layout.control.M);
    await expect(box.left).toBeGreaterThan(stepper.right);
    await expect(box.top).toBeLessThan(stepper.bottom);
  },
});

export const NoInitiativeYet = meta.story({
  tags: ['visual'],
  args: { value: null },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'InitiativeSheet');
    await canvas.findByRole('dialog', { name: 'Orc Berserker' });
    await expect(canvas.getByRole('spinbutton', { name: t('title') })).toHaveValue('—');
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
    const t = storyT(globals, 'InitiativeSheet');
    const label = t('title');
    const increase = await canvas.findByRole('button', {
      name: t('Stepper:increaseField', { label }),
    });
    const decrease = canvas.getByRole('button', { name: t('Stepper:decreaseField', { label }) });
    await userEvent.click(increase);
    await expect(args.onSet).toHaveBeenLastCalledWith(16);
    await userEvent.click(decrease);
    await userEvent.click(decrease);
    await expect(args.onSet).toHaveBeenLastCalledWith(14);
    await expect(args.onSet).toHaveBeenCalledTimes(3);
    await expect(canvas.getByRole('spinbutton', { name: label })).toHaveValue('14');
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

const rowBoxes = async (canvasElement: HTMLElement, globals: Record<string, unknown>) => {
  const t = storyT(globals, 'InitiativeSheet');
  const canvas = within(canvasElement);
  const label = (await canvas.findByText(t('title'))).getBoundingClientRect();
  const roll = canvas.getByRole('button', { name: t('roll', { bonus: '+3' }) });
  const sheet = canvas.getByRole('dialog', { name: 'Orc Berserker' });
  return {
    label,
    roll: roll.getBoundingClientRect(),
    sheet: sheet.getBoundingClientRect(),
  };
};

export const LongLabelFitsOneRow = meta.story({
  tags: ['!dev'],
  globals: { locale: 'de' },
  play: async ({ canvasElement, globals }) => {
    const { label, roll, sheet } = await rowBoxes(canvasElement, globals);
    await expect(label.right).toBeLessThanOrEqual(roll.left);
    await expect(roll.top).toBeLessThan(label.bottom);
    await expect(roll.right).toBeLessThanOrEqual(sheet.right);
  },
});

export const WideGlyphLabelFitsOneRow = meta.story({
  tags: ['!dev'],
  globals: { locale: 'ja' },
  play: async ({ canvasElement, globals }) => {
    const { label, roll, sheet } = await rowBoxes(canvasElement, globals);
    await expect(label.right).toBeLessThanOrEqual(roll.left);
    await expect(roll.top).toBeLessThan(label.bottom);
    await expect(roll.right).toBeLessThanOrEqual(sheet.right);
  },
});
