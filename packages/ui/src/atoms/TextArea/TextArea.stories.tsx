import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/TextArea.json';
import { TextArea } from './TextArea.tsx';
import type { TextAreaProps } from './TextArea.tsx';

type TextKey = keyof typeof en;

interface TextAreaCellProps extends Omit<
  TextAreaProps,
  'label' | 'value' | 'placeholder' | 'error'
> {
  labelKey?: TextKey;
  label?: string;
  placeholderKey?: TextKey;
  errorKey?: TextKey;
  valueKey?: TextKey;
  value?: string;
  width?: number;
}

function TextAreaCell({
  labelKey,
  label,
  placeholderKey,
  errorKey,
  valueKey,
  value: initialValue,
  width = 280,
  onChange,
  ...props
}: TextAreaCellProps) {
  const { t } = useTranslation('TextArea');
  const [value, setValue] = useState(initialValue ?? (valueKey ? t(valueKey) : ''));
  return (
    <div style={{ width }}>
      <TextArea
        {...props}
        label={label ?? (labelKey ? t(labelKey) : undefined)}
        placeholder={placeholderKey ? t(placeholderKey) : undefined}
        error={errorKey ? t(errorKey, { max: props.maxLength }) : undefined}
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Atoms/TextArea',
  component: TextAreaCell,
  args: { onChange: fn() },
});

const renderFocus = (args: TextAreaCellProps) => <TextAreaCell {...args} data-focus="" />;

const description = { labelKey: 'description', maxLength: 500 } as const;
const filled = { ...description, valueKey: 'descriptionValue' } as const;
const sentence = 'Session 12. Goblins hold the crossing, the orc waits on the raft. ';
const overLimit = sentence.repeat(8).slice(0, 512);
const note =
  'Concentrating on Hex. If she takes damage, roll a save; on a fail the hex ends and Orc Berserker is no longer vulnerable. Ally Tomas holds the bridge until the end of round 4, then falls back to the mill with the archers.';

export const Anatomy = meta.story({
  args: filled,
});

export const Description500Empty = meta.story({
  name: 'Description · 500 · empty',
  args: { ...description, placeholderKey: 'optional' },
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Description' });
    await expect(field.getBoundingClientRect().height).toBe(72);
    await expect(canvas.getByText('0/500')).toBeVisible();
  },
});

export const Description500Focus = meta.story({
  name: 'Description · 500 · focus',
  args: description,
  render: renderFocus,
});

export const Description500Filled = meta.story({
  name: 'Description · 500 · filled',
  args: filled,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Description' })).toHaveValue(
      'Session 12. Goblins hold the crossing, the orc waits on the raft.',
    );
    await expect(canvas.getByText('65/500')).toBeVisible();
  },
});

export const Description500Error = meta.story({
  name: 'Description · 500 · error',
  args: { ...description, value: overLimit, errorKey: 'upTo' },
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Description' });
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(canvas.getByText('512/500')).toHaveAttribute('data-over');
    await expect(canvas.getByText('Up to 500 characters')).toBeVisible();
  },
});

export const LongTextRu = meta.story({
  name: 'Long text · ru',
  args: {
    ...description,
    value:
      'Сессия 12. Гоблины держат переправу, орк ждёт на плоту. Если герои пойдут по мосту, лучники стреляют с крыши мельницы; если вплавь, берсерк прыгает в воду.',
  },
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Description' });
    await expect(field.getBoundingClientRect().height).toBeGreaterThan(72);
    await expect(field.scrollHeight).toBe(field.clientHeight);
  },
});

export const LongTextDe = meta.story({
  name: 'Long text · de',
  args: {
    ...description,
    label: 'Beschreibung',
    value:
      'Sitzung 12. Goblins halten die Furt, der Ork wartet auf dem Floß. Gehen die Helden über die Brücke, schießen die Bogenschützen vom Mühlendach.',
  },
});

export const LongTextNote250 = meta.story({
  name: 'Long text · note 250',
  args: { labelKey: 'note', maxLength: 250, value: note },
});

export const ExtraTyping = meta.story({
  name: 'Typing updates the value and the counter',
  args: { ...description, placeholderKey: 'optional', onChange: fn() },
  play: async ({ args, canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Description' });
    await userEvent.type(field, 'Goblins{Enter}Orc');
    await expect(field).toHaveValue('Goblins\nOrc');
    await expect(args.onChange).toHaveBeenLastCalledWith('Goblins\nOrc');
    await expect(canvas.getByText('11/500')).toBeVisible();
  },
});

export const ExtraMaxLength = meta.story({
  name: 'Typing stops at the limit',
  args: { labelKey: 'note', maxLength: 250, value: note.padEnd(248, '.'), onChange: fn() },
  play: async ({ args, canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Note' });
    await userEvent.type(field, 'abcd');
    await expect(field).toHaveValue(`${note.padEnd(248, '.')}ab`);
    await expect(args.onChange).toHaveBeenCalledTimes(2);
    await expect(canvas.getByText('250/250')).not.toHaveAttribute('data-over');
  },
});

export const ExtraDisabled = meta.story({
  name: 'Disabled',
  args: { ...filled, disabled: true, onChange: fn() },
  play: async ({ args, canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Description' });
    await expect(field).toBeDisabled();
    await userEvent.type(field, 'x', { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const ExtraGrows = meta.story({
  name: 'The field grows while typing',
  args: { ...description, onChange: fn() },
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Description' });
    await expect(field.getBoundingClientRect().height).toBe(72);
    await userEvent.type(field, 'One{Enter}Two{Enter}Three{Enter}Four{Enter}Five');
    await expect(field.getBoundingClientRect().height).toBeGreaterThan(72);
    await expect(field.scrollHeight).toBe(field.clientHeight);
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { ...filled, errorKey: 'upTo' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Beschreibung' })).toBeVisible();
    await expect(canvas.getByText('Bis zu 500 Zeichen')).toBeVisible();
  },
});

export const ExtraLocaleEs = meta.story({
  name: 'Locale es',
  globals: { locale: 'es' },
  args: { ...filled, errorKey: 'upTo' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Descripción' })).toBeVisible();
  },
});

export const ExtraLocaleFr = meta.story({
  name: 'Locale fr',
  globals: { locale: 'fr' },
  args: { ...filled, errorKey: 'upTo' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Descriptif' })).toBeVisible();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { ...filled, errorKey: 'upTo' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: '説明' })).toBeVisible();
    await expect(canvas.getByText('500文字まで')).toBeVisible();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { ...description, placeholderKey: 'optional' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Описание' })).toHaveAttribute(
      'placeholder',
      'Необязательно',
    );
  },
});
