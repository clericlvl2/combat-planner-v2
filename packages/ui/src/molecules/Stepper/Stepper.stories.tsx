import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/Stepper.json';
import { Stepper } from './Stepper.tsx';
import type { StepperProps } from './Stepper.tsx';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';

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

const columns = ['Default', 'At min', 'At max', 'Focus', 'Disabled'] as const;

type StepperState = (typeof columns)[number];

const gridRows = (
  [
    { label: 'With label', labelKey: 'maxHp', range: LIMITS.maxHp, value: 40 },
    { label: 'No label', range: LIMITS.defense, value: 15 },
    { label: 'S', range: LIMITS.defense, value: 15, size: 'S', width: 240 },
    { label: 'M', range: LIMITS.defense, value: 15, size: 'M', width: 240 },
    { label: 'L', range: LIMITS.defense, value: 15, size: 'L', width: 240 },
  ] as const
).map(({ label, value, ...row }) => ({
  label,
  render: (state: StepperState) => (
    <StepperCell
      {...row}
      value={state === 'At min' ? row.range.min : state === 'At max' ? row.range.max : value}
      disabled={state === 'Disabled'}
      data-focus={state === 'Focus' ? '' : undefined}
      onChange={() => {}}
    />
  ),
}));

export const AllStates = meta.story({
  tags: ['visual'],
  parameters: {
    geometry: {
      tapTargets: {
        reason: 'size S keeps its 36 px input; no screen uses Stepper S',
        except: '[data-size="S"] *',
      },
    },
  },
  render: () => <StateGrid rows={gridRows} columns={columns} />,
});

export const MinDisablesDecrease = meta.story({
  tags: ['!dev'],
  args: { labelKey: 'maxHp', value: LIMITS.maxHp.min },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Stepper');
    const decrease = canvas.getByRole('button', {
      name: t('decreaseField', { label: t('maxHp') }),
    });
    await expect(decrease).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: t('increaseField', { label: t('maxHp') }) }),
    ).toBeEnabled();
    await userEvent.click(decrease, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByRole('spinbutton', { name: t('maxHp') })).toHaveValue('1');
  },
});

export const MaxDisablesIncrease = meta.story({
  tags: ['!dev'],
  args: { labelKey: 'maxHp', value: LIMITS.maxHp.max },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Stepper');
    const increase = canvas.getByRole('button', {
      name: t('increaseField', { label: t('maxHp') }),
    });
    await expect(increase).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: t('decreaseField', { label: t('maxHp') }) }),
    ).toBeEnabled();
    await userEvent.click(increase, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByRole('spinbutton', { name: t('maxHp') })).toHaveValue('999');
  },
});

export const SignedValues = meta.story({
  tags: ['visual'],
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <StepperCell
        labelKey="initBonus"
        range={LIMITS.initiativeBonus}
        value={-5}
        onChange={() => {}}
      />
      <StepperCell
        label="Бонус к инициативе"
        range={LIMITS.initiativeBonus}
        value={3}
        onChange={() => {}}
      />
    </div>
  ),
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Stepper');
    await expect(canvas.getByRole('spinbutton', { name: t('initBonus') })).toHaveValue('−5');
    await expect(canvas.getByRole('spinbutton', { name: 'Бонус к инициативе' })).toHaveValue('+3');
  },
});

export const LongLabel = meta.story({
  args: { label: 'Бонус инициативы от ловкости', range: LIMITS.initiativeBonus, value: 3 },
});

export const DisabledIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { labelKey: 'maxHp', value: 40, disabled: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Stepper');
    const decrease = canvas.getByRole('button', {
      name: t('decreaseField', { label: t('maxHp') }),
    });
    const increase = canvas.getByRole('button', {
      name: t('increaseField', { label: t('maxHp') }),
    });
    await expect(decrease).toBeDisabled();
    await expect(increase).toBeDisabled();
    await expect(canvas.getByRole('spinbutton', { name: t('maxHp') })).toBeDisabled();
    await userEvent.click(increase, { pointerEventsCheck: 0 });
    await userEvent.click(decrease, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const KeysStepByOne = meta.story({
  tags: ['!dev'],
  args: { labelKey: 'maxHp', value: 40 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Stepper');
    await userEvent.click(
      canvas.getByRole('button', { name: t('increaseField', { label: t('maxHp') }) }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith(41);
    await userEvent.click(
      canvas.getByRole('button', { name: t('decreaseField', { label: t('maxHp') }) }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: t('decreaseField', { label: t('maxHp') }) }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith(39);
    await expect(canvas.getByRole('spinbutton', { name: t('maxHp') })).toHaveValue('39');
  },
});

export const ClampsAtMinAndMax = meta.story({
  tags: ['!dev'],
  args: { range: LIMITS.round, value: 98 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Stepper');
    const increase = canvas.getByRole('button', { name: t('increase') });
    await userEvent.click(increase);
    await expect(args.onChange).toHaveBeenLastCalledWith(99);
    await expect(increase).toBeDisabled();
    const field = canvas.getByRole('spinbutton', { name: t('value') });
    await expect(field).toHaveAttribute('inputmode', 'numeric');
    await userEvent.clear(field);
    await userEvent.type(field, '0');
    await userEvent.tab();
    await expect(args.onChange).toHaveBeenLastCalledWith(1);
    await expect(field).toHaveValue('1');
    await expect(canvas.getByRole('button', { name: t('decrease') })).toBeDisabled();
    await userEvent.clear(field);
    await userEvent.type(field, '250');
    await expect(args.onChange).toHaveBeenCalledTimes(2);
    await userEvent.tab();
    await expect(args.onChange).toHaveBeenLastCalledWith(99);
    await expect(field).toHaveValue('99');
  },
});

export const ArrowsAndEnterStep = meta.story({
  tags: ['!dev'],
  args: { labelKey: 'initBonus', range: LIMITS.initiativeBonus, value: 0 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Stepper');
    const field = canvas.getByRole('spinbutton', { name: t('initBonus') });
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

export const UnsignedValues = meta.story({
  tags: ['!dev'],
  args: { labelKey: 'initBonus', range: LIMITS.initiative, value: 15, signed: false },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Stepper');
    const field = canvas.getByRole('spinbutton', { name: t('initBonus') });
    await expect(field).toHaveValue('15');
    await expect(field).toHaveAttribute('inputmode', 'text');
    await userEvent.click(
      canvas.getByRole('button', { name: t('increaseField', { label: t('initBonus') }) }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith(16);
    await expect(field).toHaveValue('16');
    await userEvent.clear(field);
    await userEvent.type(field, '-3{Enter}');
    await expect(args.onChange).toHaveBeenLastCalledWith(-3);
    await expect(field).toHaveValue('−3');
  },
});

export const EmptyStepsUp = meta.story({
  tags: ['!dev'],
  args: { labelKey: 'initBonus', range: LIMITS.initiative, value: null, signed: false },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Stepper');
    const field = canvas.getByRole('spinbutton', { name: t('initBonus') });
    await expect(field).toHaveValue('—');
    await expect(field).not.toHaveAttribute('aria-valuenow');
    await expect(
      canvas.getByRole('button', { name: t('decreaseField', { label: t('initBonus') }) }),
    ).toBeEnabled();
    await userEvent.click(
      canvas.getByRole('button', { name: t('increaseField', { label: t('initBonus') }) }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith(1);
    await expect(field).toHaveValue('1');
    await expect(field).toHaveAttribute('aria-valuenow', '1');
  },
});

export const EmptyStepsDown = meta.story({
  tags: ['!dev'],
  args: { labelKey: 'initBonus', range: LIMITS.initiative, value: null, signed: false },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Stepper');
    const field = canvas.getByRole('spinbutton', { name: t('initBonus') });
    await expect(field).toHaveValue('—');
    await userEvent.click(
      canvas.getByRole('button', { name: t('decreaseField', { label: t('initBonus') }) }),
    );
    await expect(args.onChange).toHaveBeenLastCalledWith(-1);
    await expect(field).toHaveValue('−1');
    await expect(field).toHaveAttribute('aria-valuenow', '-1');
  },
});
