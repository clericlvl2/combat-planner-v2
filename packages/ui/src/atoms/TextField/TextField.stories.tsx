import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/TextField.json';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { TextField } from './TextField.tsx';
import type { TextFieldProps, TextFieldSize } from './TextField.tsx';

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
    <div style={{ width, maxWidth: '100%' }}>
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

const title = { labelKey: 'title', maxLength: 80, width: 250 } as const;
const filledTitle = { ...title, valueKey: 'titleValue' } as const;
const ruName = 'Капитан стражи переправы Святослав Огнев';
const name = { labelKey: 'name', maxLength: 40, width: 250 } as const;

const states = ['empty', 'focus', 'filled', 'error', 'disabled'] as const;
type State = (typeof states)[number];

const row = (size: TextFieldSize) => ({
  label: size,
  render: (state: State) => (
    <TextFieldCell
      {...title}
      size={size}
      width={280}
      placeholderKey="titlePlaceholder"
      valueKey={state === 'filled' || state === 'disabled' ? 'titleValue' : undefined}
      errorKey={state === 'error' ? 'enterTitle' : undefined}
      disabled={state === 'disabled'}
      data-focus={state === 'focus' ? '' : undefined}
    />
  ),
});

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => <StateGrid columns={states} rows={[row('S'), row('M'), row('L')]} />,
});

export const LongValueWraps = meta.story({
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

export const OverLimit = meta.story({
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

export const EmailAndPassword = meta.story({
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

export const DisabledIgnoresTyping = meta.story({
  tags: ['!dev'],
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

export const ErrorIsAnnounced = meta.story({
  tags: ['!dev'],
  args: { ...title, placeholderKey: 'titlePlaceholder', errorKey: 'enterTitle' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'TextField');
    const field = canvas.getByRole('textbox', { name: t('title') });
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(`${t('enterTitle')} 0/80`);
  },
});

export const TypingUpdatesCounter = meta.story({
  tags: ['!dev'],
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

export const TypingStopsAtLimit = meta.story({
  tags: ['!dev'],
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

export const LineBreaksStayOnOneLine = meta.story({
  tags: ['!dev'],
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

export const HeightsBySize = meta.story({
  tags: ['!dev'],
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

export const FrameClickFocusesField = meta.story({
  tags: ['!dev'],
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
