import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/Stepper.json';
import { Stepper } from './Stepper.tsx';
import type { StepperProps } from './Stepper.tsx';

type LabelKey = keyof typeof en;

interface StepperCellProps extends Omit<StepperProps, 'label' | 'min' | 'max'> {
  range?: { min: number; max: number };
  labelKey?: LabelKey;
  label?: string;
  width?: number;
}

const stage = {
  boxSizing: 'content-box',
  display: 'flex',
  padding: 16,
  borderRadius: 12,
  background: 'var(--cp-color-surface)',
} as const;

function StepperCell({
  value: initialValue,
  onChange,
  range = LIMITS.maxHp,
  labelKey,
  label,
  width = 300,
  ...props
}: StepperCellProps) {
  const { t } = useTranslation('Stepper');
  const [value, setValue] = useState(initialValue);
  return (
    <div style={{ ...stage, width }}>
      <Stepper
        {...props}
        min={range.min}
        max={range.max}
        label={label ?? (labelKey ? t(labelKey) : undefined)}
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Molecules/Stepper',
  component: StepperCell,
  args: { value: 40, onChange: fn() },
});

const renderFocus = (args: StepperCellProps) => <StepperCell {...args} data-focus="" />;

export const Anatomy = meta.story({
  args: { labelKey: 'maxHp', value: 40 },
});

export const WithLabelDefault = meta.story({
  name: 'With label · default',
  args: { labelKey: 'maxHp', value: 40 },
});

export const WithLabelMin = meta.story({
  name: 'With label · min',
  args: { labelKey: 'maxHp', value: LIMITS.maxHp.min },
  play: async ({ args, canvas }) => {
    const decrease = canvas.getByRole('button', { name: 'Decrease' });
    await expect(decrease).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Increase' })).toBeEnabled();
    await userEvent.click(decrease, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByRole('spinbutton', { name: 'Max HP' })).toHaveValue('1');
  },
});

export const WithLabelMax = meta.story({
  name: 'With label · max',
  args: { labelKey: 'maxHp', value: LIMITS.maxHp.max },
  play: async ({ args, canvas }) => {
    const increase = canvas.getByRole('button', { name: 'Increase' });
    await expect(increase).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Decrease' })).toBeEnabled();
    await userEvent.click(increase, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByRole('spinbutton', { name: 'Max HP' })).toHaveValue('999');
  },
});

export const WithLabelFocus = meta.story({
  name: 'With label · focus',
  args: { labelKey: 'maxHp', value: 40 },
  render: renderFocus,
});

export const NoLabelDefault = meta.story({
  name: 'No label · default',
  args: { range: LIMITS.defense, value: 15 },
});

export const NoLabelMin = meta.story({
  name: 'No label · min',
  args: { range: LIMITS.defense, value: LIMITS.defense.min },
});

export const NoLabelMax = meta.story({
  name: 'No label · max',
  args: { range: LIMITS.defense, value: LIMITS.defense.max },
});

export const NoLabelFocus = meta.story({
  name: 'No label · focus',
  args: { range: LIMITS.defense, value: 15 },
  render: renderFocus,
});

export const StepperS = meta.story({
  name: 'Stepper · S',
  args: { range: LIMITS.defense, value: 15, size: 'S', width: 240 },
});

export const StepperM = meta.story({
  name: 'Stepper · M',
  args: { range: LIMITS.defense, value: 15, size: 'M', width: 240 },
});

export const StepperL = meta.story({
  name: 'Stepper · L',
  args: { range: LIMITS.defense, value: 15, size: 'L', width: 240 },
});

export const ValuesAndLabels999 = meta.story({
  name: 'Values and labels · 999',
  args: { labelKey: 'maxHp', value: 999 },
});

export const ValuesAndLabels5 = meta.story({
  name: 'Values and labels · −5',
  args: { labelKey: 'initBonus', range: LIMITS.initiativeBonus, value: -5 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('spinbutton', { name: 'Init bonus' })).toHaveValue('−5');
  },
});

export const ValuesAndLabelsDe = meta.story({
  name: 'Values and labels · de',
  args: { label: 'Initiativebonus', range: LIMITS.initiativeBonus, value: 3 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('spinbutton', { name: 'Initiativebonus' })).toHaveValue('+3');
  },
});

export const ValuesAndLabelsRu = meta.story({
  name: 'Values and labels · ru',
  args: { label: 'Бонус инициативы', range: LIMITS.initiativeBonus, value: 3 },
});

export const ExtraDisabled = meta.story({
  name: 'Disabled',
  args: { labelKey: 'maxHp', value: 40, disabled: true },
  play: async ({ args, canvas }) => {
    const decrease = canvas.getByRole('button', { name: 'Decrease' });
    const increase = canvas.getByRole('button', { name: 'Increase' });
    await expect(decrease).toBeDisabled();
    await expect(increase).toBeDisabled();
    await expect(canvas.getByRole('spinbutton', { name: 'Max HP' })).toBeDisabled();
    await userEvent.click(increase, { pointerEventsCheck: 0 });
    await userEvent.click(decrease, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const ExtraKeys = meta.story({
  name: 'Keys step by one',
  args: { labelKey: 'maxHp', value: 40 },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Increase' }));
    await expect(args.onChange).toHaveBeenLastCalledWith(41);
    await userEvent.click(canvas.getByRole('button', { name: 'Decrease' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Decrease' }));
    await expect(args.onChange).toHaveBeenLastCalledWith(39);
    await expect(canvas.getByRole('spinbutton', { name: 'Max HP' })).toHaveValue('39');
  },
});

export const ExtraClampAtBounds = meta.story({
  name: 'Clamps at min and max',
  args: { range: LIMITS.round, value: 98 },
  play: async ({ args, canvas }) => {
    const increase = canvas.getByRole('button', { name: 'Increase' });
    await userEvent.click(increase);
    await expect(args.onChange).toHaveBeenLastCalledWith(99);
    await expect(increase).toBeDisabled();
    const field = canvas.getByRole('spinbutton', { name: 'Value' });
    await expect(field).toHaveAttribute('inputmode', 'numeric');
    await userEvent.clear(field);
    await userEvent.type(field, '0');
    await userEvent.tab();
    await expect(args.onChange).toHaveBeenLastCalledWith(1);
    await expect(field).toHaveValue('1');
    await expect(canvas.getByRole('button', { name: 'Decrease' })).toBeDisabled();
    await userEvent.clear(field);
    await userEvent.type(field, '250');
    await expect(args.onChange).toHaveBeenCalledTimes(2);
    await userEvent.tab();
    await expect(args.onChange).toHaveBeenLastCalledWith(99);
    await expect(field).toHaveValue('99');
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: arrows and Enter',
  args: { labelKey: 'initBonus', range: LIMITS.initiativeBonus, value: 0 },
  play: async ({ args, canvas }) => {
    const field = canvas.getByRole('spinbutton', { name: 'Init bonus' });
    await expect(field).toHaveValue('+0');
    await userEvent.click(field);
    await userEvent.keyboard('{ArrowDown}');
    await expect(args.onChange).toHaveBeenLastCalledWith(-1);
    await expect(field).toHaveValue('−1');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    await expect(args.onChange).toHaveBeenLastCalledWith(1);
    await expect(field).toHaveValue('+1');
    await userEvent.clear(field);
    await userEvent.type(field, '-7{Enter}');
    await expect(args.onChange).toHaveBeenLastCalledWith(-7);
    await expect(field).toHaveValue('−7');
  },
});

export const ExtraUnsigned = meta.story({
  name: 'Unsigned positive values',
  args: { labelKey: 'initBonus', range: LIMITS.initiative, value: 15, signed: false },
  play: async ({ args, canvas }) => {
    const field = canvas.getByRole('spinbutton', { name: 'Init bonus' });
    await expect(field).toHaveValue('15');
    await expect(field).toHaveAttribute('inputmode', 'text');
    await userEvent.click(canvas.getByRole('button', { name: 'Increase' }));
    await expect(args.onChange).toHaveBeenLastCalledWith(16);
    await expect(field).toHaveValue('16');
    await userEvent.clear(field);
    await userEvent.type(field, '-3{Enter}');
    await expect(args.onChange).toHaveBeenLastCalledWith(-3);
    await expect(field).toHaveValue('−3');
  },
});

export const ExtraEmpty = meta.story({
  name: 'Empty value',
  args: { labelKey: 'initBonus', range: LIMITS.initiative, value: null, signed: false },
  play: async ({ args, canvas }) => {
    const field = canvas.getByRole('spinbutton', { name: 'Init bonus' });
    await expect(field).toHaveValue('—');
    await expect(field).not.toHaveAttribute('aria-valuenow');
    await expect(canvas.getByRole('button', { name: 'Decrease' })).toBeEnabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Increase' }));
    await expect(args.onChange).toHaveBeenLastCalledWith(1);
    await expect(field).toHaveValue('1');
    await expect(field).toHaveAttribute('aria-valuenow', '1');
  },
});

export const ExtraEmptyDecrease = meta.story({
  name: 'Empty value steps down',
  args: { labelKey: 'initBonus', range: LIMITS.initiative, value: null, signed: false },
  play: async ({ args, canvas }) => {
    const field = canvas.getByRole('spinbutton', { name: 'Init bonus' });
    await expect(field).toHaveValue('—');
    await userEvent.click(canvas.getByRole('button', { name: 'Decrease' }));
    await expect(args.onChange).toHaveBeenLastCalledWith(-1);
    await expect(field).toHaveValue('−1');
    await expect(field).toHaveAttribute('aria-valuenow', '-1');
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { labelKey: 'maxHp', value: 40 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('spinbutton', { name: 'Макс. ОЗ' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Уменьшить' })).toBeEnabled();
  },
});
