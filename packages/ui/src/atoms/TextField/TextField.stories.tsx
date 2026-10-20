import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/TextField.json';
import { TextField } from './TextField.tsx';
import type { TextFieldProps } from './TextField.tsx';
import { storyT } from '../../storybook/storyT.ts';

type TextKey = keyof typeof en;

interface TextFieldCellProps extends Omit<
  TextFieldProps,
  'label' | 'value' | 'placeholder' | 'error'
> {
  labelKey?: TextKey;
  placeholderKey?: TextKey;
  errorKey?: TextKey;
  valueKey?: TextKey;
  value?: string;
  width?: number;
}

function TextFieldCell({
  labelKey,
  placeholderKey,
  errorKey,
  valueKey,
  value: initialValue,
  width = 280,
  onChange,
  ...props
}: TextFieldCellProps) {
  const { t } = useTranslation('TextField');
  const [value, setValue] = useState(initialValue ?? (valueKey ? t(valueKey) : ''));
  return (
    <div style={{ width }}>
      <TextField
        {...props}
        label={labelKey ? t(labelKey) : undefined}
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
  title: 'Atoms/TextField',
  component: TextFieldCell,
  args: { onChange: fn() },
});

const renderFocus = (args: TextFieldCellProps) => <TextFieldCell {...args} data-focus="" />;

const title = { labelKey: 'title', maxLength: 80, width: 250 } as const;
const filledTitle = { ...title, valueKey: 'titleValue' } as const;
const ruName = 'Капитан стражи переправы Святослав Огнев';
const jaName = '影の射手ゴブリン';
const name = { labelKey: 'name', maxLength: 40, width: 250 } as const;

export const Anatomy = meta.story({
  tags: ['visual'],
  args: { ...filledTitle, width: 280 },
});

export const Title80Empty = meta.story({
  name: 'Title · 80 · empty',
  args: { ...title, placeholderKey: 'titlePlaceholder' },
});

export const Title80Focus = meta.story({
  name: 'Title · 80 · focus',
  args: title,
  render: renderFocus,
});

export const Title80Filled = meta.story({
  name: 'Title · 80 · filled',
  args: filledTitle,
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TextField');
    await expect(canvas.getByRole('textbox', { name: t('title') })).toHaveValue(t('titleValue'));
    await expect(canvas.getByText(`${t('titleValue').length}/80`)).toBeVisible();
  },
});

export const Title80Error = meta.story({
  tags: ['visual'],
  name: 'Title · 80 · error',
  args: { ...title, placeholderKey: 'titlePlaceholder', errorKey: 'enterTitle' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TextField');
    const field = canvas.getByRole('textbox', { name: t('title') });
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(`${t('enterTitle')} 0/80`);
  },
});

export const Title80Disabled = meta.story({
  name: 'Title · 80 · disabled',
  args: { ...filledTitle, disabled: true, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TextField');
    const field = canvas.getByRole('textbox', { name: t('title') });
    await expect(field).toBeDisabled();
    await userEvent.type(field, 'x', { pointerEventsCheck: 0 });
    await expect(field).toHaveValue(t('titleValue'));
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const TextFieldS = meta.story({
  tags: ['visual'],
  name: 'TextField · S',
  args: { ...filledTitle, size: 'S', width: 280 },
});

export const TextFieldM = meta.story({
  name: 'TextField · M',
  args: { ...filledTitle, size: 'M', width: 280 },
});

export const TextFieldL = meta.story({
  name: 'TextField · L',
  args: { ...filledTitle, size: 'L', width: 280 },
});

export const NameRuFilled = meta.story({
  name: 'Name, ru · filled',
  args: { ...name, value: 'Капитан стражи переправы Святослав Огнев' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TextField');
    await expect(canvas.getByText('40/40')).toBeVisible();
    const field = canvas.getByRole('textbox', { name: t('name') });
    const frame = field.closest('[data-field]');
    await expect(frame?.getBoundingClientRect().height).toBeGreaterThan(48);
    await expect(field.scrollHeight).toBeLessThanOrEqual(field.clientHeight);
  },
});

export const NameRuFocus = meta.story({
  name: 'Name, ru · focus',
  args: { ...name, value: 'Капитан стражи переправы Святослав Огнев' },
  render: renderFocus,
});

export const NameRuOverLimit = meta.story({
  name: 'Name, ru · over limit',
  args: {
    ...name,
    value: 'Капитан стражи переправы Святослав Огнев!',
    errorKey: 'upTo',
  },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TextField');
    await expect(canvas.getByText('41/40')).toHaveAttribute('data-over');
    await expect(canvas.getByText(t('upTo', { max: 40 }))).toBeVisible();
  },
});

export const NameJaFilled = meta.story({
  name: 'Name, ja · filled',
  args: { ...name, value: '影の射手ゴブリン' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('8/40')).toBeVisible();
  },
});

export const NameJaFocus = meta.story({
  name: 'Name, ja · focus',
  args: { ...name, value: '影の射手ゴブリン' },
  render: renderFocus,
});

export const NameJaOverLimit = meta.story({
  name: 'Name, ja · over limit',
  args: { ...name, placeholderKey: 'namePlaceholder', errorKey: 'enterName' },
});

export const ExtraTyping = meta.story({
  name: 'Typing updates the value and the counter',
  args: { ...title, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TextField');
    const field = canvas.getByRole('textbox', { name: t('title') });
    await userEvent.type(field, 'Goblin raid');
    await expect(field).toHaveValue('Goblin raid');
    await expect(args.onChange).toHaveBeenLastCalledWith('Goblin raid');
    await expect(canvas.getByText('11/80')).toBeVisible();
  },
});

export const ExtraMaxLength = meta.story({
  name: 'Typing stops at the limit',
  args: { ...name, value: ruName.slice(0, 38), onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TextField');
    const field = canvas.getByRole('textbox', { name: t('name') });
    await userEvent.type(field, 'вабcd');
    await expect(field).toHaveValue(`${ruName.slice(0, 38)}ва`);
    await expect(args.onChange).toHaveBeenCalledTimes(2);
    await expect(canvas.getByText('40/40')).toHaveAttribute('data-over');
  },
});

export const ExtraSingleLine = meta.story({
  name: 'Enter and pasted line breaks stay on one line',
  args: { ...name, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'TextField');
    const field = canvas.getByRole('textbox', { name: t('name') });
    await userEvent.type(field, 'Orc{Enter}');
    await expect(field).toHaveValue('Orc');
    await userEvent.paste('\nBerserker');
    await expect(field).toHaveValue('Orc Berserker');
    await expect(args.onChange).toHaveBeenLastCalledWith('Orc Berserker');
  },
});

export const ExtraSizes = meta.story({
  name: 'Heights per size',
  args: filledTitle,
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TextFieldCell {...args} size="S" />
      <TextFieldCell {...args} size="M" />
      <TextFieldCell {...args} size="L" />
    </div>
  ),
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TextField');
    const fields = canvas.getAllByRole('textbox', { name: t('title') });
    const heights = fields.map(
      (field) => field.closest('[data-field]')?.getBoundingClientRect().height,
    );
    const fonts = fields.map((field) => getComputedStyle(field).fontSize);
    await expect(heights).toEqual([40, 48, 56]);
    await expect(fonts).toEqual(['14px', '16px', '18px']);
  },
});

export const ExtraSignIn = meta.story({
  name: 'Email and password stay on one line',
  args: { onChange: fn() },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TextFieldCell {...args} type="email" labelKey="email" />
      <TextFieldCell {...args} type="password" labelKey="password" />
    </div>
  ),
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'TextField');
    const email = canvas.getByRole('textbox', { name: t('email') });
    await expect(email.tagName).toBe('INPUT');
    await expect(email).toHaveAttribute('type', 'email');
    await expect(email).not.toHaveAttribute('maxlength');
    await userEvent.type(email, 'dm@example.com');
    await expect(email).toHaveValue('dm@example.com');
    const password = canvasElement.querySelector<HTMLInputElement>('input[type="password"]');
    await expect(password?.labels?.[0]?.textContent).toBe(t('password'));
    if (password) await userEvent.type(password, 'secret{Enter}');
    await expect(password).toHaveValue('secret');
    await expect(args.onChange).toHaveBeenLastCalledWith('secret');
    const heights = [email, password].map(
      (field) => field?.closest('[data-field]')?.getBoundingClientRect().height,
    );
    await expect(heights).toEqual([48, 48]);
    await expect(canvas.queryByText(/^\d+\/\d+$/)).toBeNull();
  },
});

export const ExtraFrameClick = meta.story({
  name: 'Clicking the frame focuses the field',
  args: { ...title, onChange: fn() },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TextField');
    const field = canvas.getByRole('textbox', { name: t('title') });
    const frame = field.closest<HTMLElement>('[data-field]');
    if (frame)
      await userEvent.pointer({ keys: '[MouseLeft]', target: frame, coords: { x: 4, y: 4 } });
    await expect(field).toHaveFocus();
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { ...title, placeholderKey: 'titlePlaceholder', errorKey: 'enterTitle' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Titel' })).toBeVisible();
    await expect(canvas.getByText('Titel eingeben')).toBeVisible();
  },
});

export const ExtraLocaleEs = meta.story({
  name: 'Locale es',
  globals: { locale: 'es' },
  args: { ...title, placeholderKey: 'titlePlaceholder', errorKey: 'enterTitle' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Título' })).toBeVisible();
  },
});

export const ExtraLocaleFr = meta.story({
  name: 'Locale fr',
  globals: { locale: 'fr' },
  args: { ...title, placeholderKey: 'titlePlaceholder', errorKey: 'enterTitle' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Titre' })).toBeVisible();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { ...name, errorKey: 'upTo', value: jaName },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('40文字まで')).toBeVisible();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { ...name, errorKey: 'upTo', value: ruName },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Имя' })).toHaveValue(ruName);
    await expect(canvas.getByText('Не больше 40 символов')).toBeVisible();
  },
});
