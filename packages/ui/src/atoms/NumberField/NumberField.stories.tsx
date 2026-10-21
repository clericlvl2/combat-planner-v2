import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/NumberField.json';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { NumberField } from './NumberField.tsx';
import type { NumberFieldProps } from './NumberField.tsx';

type LabelKey = keyof typeof en;

interface NumberFieldCellProps extends Omit<NumberFieldProps, 'label' | 'error'> {
  labelKey?: LabelKey;
  errorKey?: LabelKey;
}

function NumberFieldCell({
  value: initialValue,
  onChange,
  labelKey = 'amount',
  errorKey,
  ...props
}: NumberFieldCellProps) {
  const { t } = useTranslation('NumberField');
  const [value, setValue] = useState(initialValue);
  return (
    <div style={{ width: 320 }}>
      <NumberField
        {...props}
        label={t(labelKey)}
        error={errorKey ? t(errorKey, { min: props.min, max: props.max }) : undefined}
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
  title: 'Atoms/NumberField',
  component: NumberFieldCell,
  args: { value: null, onChange: fn() },
});

const states = ['empty', 'filled', 'focus', 'disabled', 'error'] as const;
type State = (typeof states)[number];

const row = (label: string, props: Partial<NumberFieldCellProps>, filled = 12) => ({
  label,
  render: (state: State) => (
    <NumberFieldCell
      {...props}
      onChange={fn()}
      value={state === 'empty' || state === 'error' ? null : filled}
      disabled={state === 'disabled'}
      errorKey={state === 'error' ? 'errorRange' : undefined}
      data-focus={state === 'focus' ? '' : undefined}
    />
  ),
});

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => (
    <StateGrid
      columns={states}
      rows={[
        row('Amount', { min: LIMITS.amount.min, max: LIMITS.amount.max }),
        row('Max HP', { labelKey: 'maxHp', min: 1, max: 999 }),
        row('Signed', { min: -999, max: 999 }, -12),
      ]}
    />
  ),
});

export const TypingAndBackspace = meta.story({
  tags: ['!dev'],
  args: { value: null, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NumberField');
    const input = canvas.getByRole('textbox', { name: t('amount') });
    await expect(input).toHaveAttribute('inputmode', 'numeric');
    await userEvent.type(input, '12');
    await expect(args.onChange).toHaveBeenNthCalledWith(1, 1);
    await expect(args.onChange).toHaveBeenNthCalledWith(2, 12);
    await expect(input).toHaveValue('12');
    await userEvent.keyboard('{Backspace}');
    await expect(args.onChange).toHaveBeenLastCalledWith(1);
    await expect(input).toHaveValue('1');
  },
});

export const ClampsToMax = meta.story({
  tags: ['!dev'],
  args: { value: null, max: 999, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NumberField');
    const input = canvas.getByRole('textbox', { name: t('amount') });
    await userEvent.type(input, '1234');
    await expect(args.onChange).toHaveBeenLastCalledWith(999);
    await expect(input).toHaveValue('999');
    await userEvent.keyboard('{ArrowUp}');
    await expect(args.onChange).toHaveBeenLastCalledWith(999);
    await expect(input).toHaveValue('999');
  },
});

export const ClampsToMinOnBlur = meta.story({
  tags: ['!dev'],
  args: { value: null, labelKey: 'maxHp', min: 1, max: 999, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NumberField');
    const input = canvas.getByRole('textbox', { name: t('maxHp') });
    await userEvent.type(input, '0');
    await expect(args.onChange).toHaveBeenLastCalledWith(0);
    await userEvent.tab();
    await expect(args.onChange).toHaveBeenLastCalledWith(1);
    await expect(input).toHaveValue('1');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}');
    await expect(args.onChange).toHaveBeenLastCalledWith(1);
  },
});

export const RejectsNonNumericInput = meta.story({
  tags: ['!dev'],
  args: { value: null, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NumberField');
    const input = canvas.getByRole('textbox', { name: t('amount') });
    await userEvent.type(input, 'abc-.e');
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(input).toHaveValue('');
    await userEvent.type(input, '4x5');
    await expect(args.onChange).toHaveBeenCalledTimes(2);
    await expect(args.onChange).toHaveBeenLastCalledWith(45);
    await expect(input).toHaveValue('45');
  },
});

export const SignWhenMinIsNegative = meta.story({
  tags: ['!dev'],
  args: { value: null, min: -999, max: 999, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NumberField');
    const input = canvas.getByRole('textbox', { name: t('amount') });
    await userEvent.type(input, '-45');
    await expect(args.onChange).toHaveBeenLastCalledWith(-45);
    await expect(input).toHaveValue('-45');
    await userEvent.type(input, '67');
    await expect(args.onChange).toHaveBeenLastCalledWith(-999);
    await expect(input).toHaveValue('-999');
  },
});

export const ArrowKeysStep = meta.story({
  tags: ['!dev'],
  args: { value: 10, step: 5, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NumberField');
    const input = canvas.getByRole('textbox', { name: t('amount') });
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}');
    await expect(args.onChange).toHaveBeenLastCalledWith(15);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(args.onChange).toHaveBeenLastCalledWith(5);
    await expect(input).toHaveValue('5');
  },
});

export const FrameClickFocusesInput = meta.story({
  tags: ['!dev'],
  args: { value: 12, onChange: fn() },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'NumberField');
    const input = canvas.getByRole('textbox', { name: t('amount') });
    const frame = input.closest<HTMLElement>('[data-field]');
    if (frame) {
      await userEvent.pointer({ keys: '[MouseLeft]', target: frame, coords: { x: 4, y: 4 } });
    }
    await expect(input).toHaveFocus();
  },
});

export const WidthFollowsMaxDigits = meta.story({
  tags: ['!dev'],
  args: { value: 99, min: 0, max: 99, onChange: fn() },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <NumberFieldCell {...args} />
      <NumberFieldCell {...args} min={1} max={999} value={999} />
    </div>
  ),
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'NumberField');
    const [defense, maxHp] = canvas.getAllByRole('textbox', { name: t('amount') });
    await expect(defense).toHaveAttribute('size', '2');
    await expect(maxHp).toHaveAttribute('size', '3');
    const widths = [defense, maxHp].map((input) => input?.getBoundingClientRect().width ?? 0);
    await expect(widths[0]).toBeLessThan(widths[1] ?? 0);
    await expect(widths[1]).toBeLessThanOrEqual(96);
  },
});

export const DisabledIgnoresTyping = meta.story({
  tags: ['!dev'],
  args: { value: 12, disabled: true, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NumberField');
    const input = canvas.getByRole('textbox', { name: t('amount') });
    await expect(input).toBeDisabled();
    await userEvent.type(input, '3', { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(input).toHaveValue('12');
  },
});

export const ErrorIsAnnounced = meta.story({
  tags: ['!dev'],
  args: { value: null, labelKey: 'maxHp', min: 1, max: 999, errorKey: 'errorRange' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'NumberField');
    const input = canvas.getByRole('textbox', { name: t('maxHp') });
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription(t('errorRange', { min: 1, max: 999 }));
  },
});
