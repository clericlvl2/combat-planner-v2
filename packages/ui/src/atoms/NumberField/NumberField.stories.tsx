import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/NumberField.json';
import { NumberField } from './NumberField.tsx';
import type { NumberFieldProps } from './NumberField.tsx';

type LabelKey = keyof typeof en;

interface NumberFieldCellProps extends Omit<NumberFieldProps, 'label' | 'error'> {
  labelKey?: LabelKey;
  label?: string;
  errorKey?: LabelKey;
}

function NumberFieldCell({
  value: initialValue,
  onChange,
  labelKey = 'amount',
  label,
  errorKey,
  ...props
}: NumberFieldCellProps) {
  const { t } = useTranslation('NumberField');
  const [value, setValue] = useState(initialValue);
  return (
    <div style={{ width: 320 }}>
      <NumberField
        {...props}
        label={label ?? t(labelKey)}
        error={errorKey ? t(errorKey) : undefined}
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

const renderFocus = (args: NumberFieldCellProps) => <NumberFieldCell {...args} data-focus="" />;

export const Anatomy = meta.story({
  args: { value: 12 },
  render: renderFocus,
});

export const AmountEmpty = meta.story({
  name: 'Amount · empty',
  args: { value: null },
});

export const AmountTyping = meta.story({
  name: 'Amount · typing',
  args: { value: 1 },
  render: renderFocus,
});

export const AmountFilled = meta.story({
  name: 'Amount · filled',
  args: { value: 12 },
  render: renderFocus,
});

export const Amount999 = meta.story({
  name: 'Amount · 999',
  args: { value: 999 },
  render: renderFocus,
});

export const AmountRu = meta.story({
  name: 'Amount · ru',
  args: { label: 'Значение', value: 120 },
  render: renderFocus,
});

export const AmountEs = meta.story({
  name: 'Amount · es',
  args: { label: 'Cantidad', value: 45 },
  render: renderFocus,
});

export const ExtraTyping = meta.story({
  name: 'Typing and backspace',
  args: { value: null, onChange: fn() },
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Amount' });
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

export const ExtraClampMax = meta.story({
  name: 'Clamps to max',
  args: { value: null, max: 999, onChange: fn() },
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Amount' });
    await userEvent.type(input, '1234');
    await expect(args.onChange).toHaveBeenLastCalledWith(999);
    await expect(input).toHaveValue('999');
    await userEvent.keyboard('{ArrowUp}');
    await expect(args.onChange).toHaveBeenLastCalledWith(999);
    await expect(input).toHaveValue('999');
  },
});

export const ExtraClampMin = meta.story({
  name: 'Clamps to min on blur',
  args: { value: null, labelKey: 'maxHp', min: 1, max: 999, onChange: fn() },
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Max HP' });
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

export const ExtraRejectsNonNumeric = meta.story({
  name: 'Rejects non-numeric input',
  args: { value: null, onChange: fn() },
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Amount' });
    await userEvent.type(input, 'abc-.e');
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(input).toHaveValue('');
    await userEvent.type(input, '4x5');
    await expect(args.onChange).toHaveBeenCalledTimes(2);
    await expect(args.onChange).toHaveBeenLastCalledWith(45);
    await expect(input).toHaveValue('45');
  },
});

export const ExtraNegative = meta.story({
  name: 'Sign when min is negative',
  args: { value: null, min: -999, max: 999, onChange: fn() },
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Amount' });
    await userEvent.type(input, '-45');
    await expect(args.onChange).toHaveBeenLastCalledWith(-45);
    await expect(input).toHaveValue('-45');
    await userEvent.type(input, '67');
    await expect(args.onChange).toHaveBeenLastCalledWith(-999);
    await expect(input).toHaveValue('-999');
  },
});

export const ExtraArrowKeys = meta.story({
  name: 'Arrow keys step',
  args: { value: 10, step: 5, onChange: fn() },
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Amount' });
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowUp}');
    await expect(args.onChange).toHaveBeenLastCalledWith(15);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await expect(args.onChange).toHaveBeenLastCalledWith(5);
    await expect(input).toHaveValue('5');
  },
});

export const ExtraDisabled = meta.story({
  name: 'Disabled',
  args: { value: 12, disabled: true, onChange: fn() },
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Amount' });
    await expect(input).toBeDisabled();
    await userEvent.type(input, '3', { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(input).toHaveValue('12');
  },
});

export const ExtraError = meta.story({
  name: 'Error',
  args: { value: null, labelKey: 'maxHp', min: 1, errorKey: 'errorRange' },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Max HP' });
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription('From 1 to 999');
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { value: 12, labelKey: 'maxHp' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Max. TP' })).toHaveValue('12');
  },
});

export const ExtraLocaleEs = meta.story({
  name: 'Locale es',
  globals: { locale: 'es' },
  args: { value: 12, labelKey: 'maxHp' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'PG máx.' })).toHaveValue('12');
  },
});

export const ExtraLocaleFr = meta.story({
  name: 'Locale fr',
  globals: { locale: 'fr' },
  args: { value: 12, labelKey: 'maxHp' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'PV max' })).toHaveValue('12');
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { value: 12, labelKey: 'amount' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: '数値' })).toHaveValue('12');
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { value: null, labelKey: 'maxHp', min: 1, errorKey: 'errorRange' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('От 1 до 999')).toBeVisible();
  },
});
