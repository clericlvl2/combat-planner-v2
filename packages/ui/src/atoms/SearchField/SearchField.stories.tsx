import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/SearchField.json';
import { SearchField } from './SearchField.tsx';
import type { SearchFieldProps } from './SearchField.tsx';

type LabelKey = keyof typeof en;

interface SearchFieldCellProps extends Omit<SearchFieldProps, 'placeholder'> {
  placeholderKey?: LabelKey;
  placeholder?: string;
}

function SearchFieldCell({
  value: initialValue,
  onChange,
  placeholderKey,
  placeholder,
  ...props
}: SearchFieldCellProps) {
  const { t } = useTranslation('SearchField');
  const [value, setValue] = useState(initialValue);
  return (
    <div style={{ width: 280 }}>
      <SearchField
        {...props}
        value={value}
        placeholder={placeholder ?? (placeholderKey ? t(placeholderKey) : undefined)}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Atoms/SearchField',
  component: SearchFieldCell,
  args: { value: '', onChange: fn(), onClear: fn() },
});

const renderFocus = (args: SearchFieldCellProps) => <SearchFieldCell {...args} data-focus="" />;

export const Anatomy = meta.story({
  args: { value: 'ferry' },
  render: renderFocus,
});

export const CombatsEmpty = meta.story({
  name: 'Combats · empty',
  args: { value: '', placeholderKey: 'searchCombats' },
});

export const CombatsFocus = meta.story({
  name: 'Combats · focus',
  args: { value: '', placeholder: '' },
  render: renderFocus,
});

export const CombatsFilled = meta.story({
  name: 'Combats · filled',
  args: { value: 'ferry' },
  render: renderFocus,
});

export const CombatsDisabled = meta.story({
  name: 'Combats · disabled',
  args: { value: '', placeholderKey: 'searchCombats', disabled: true, onChange: fn() },
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('searchbox', { name: 'Search combats' });
    await expect(input).toBeDisabled();
    await userEvent.type(input, 'ferry', { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(input).toHaveValue('');
  },
});

export const SearchFieldS = meta.story({
  name: 'SearchField · S',
  args: { size: 'S', value: 'ferry' },
});

export const SearchFieldM = meta.story({
  name: 'SearchField · M',
  args: { size: 'M', value: 'ferry' },
});

export const SearchFieldL = meta.story({
  name: 'SearchField · L',
  args: { size: 'L', value: 'ferry' },
});

export const QueriesLong = meta.story({
  name: 'Queries · long',
  args: { value: 'brother tomas of the silver lantern' },
  render: renderFocus,
});

export const QueriesRu = meta.story({
  name: 'Queries · ru',
  args: { value: 'капитан стражи переправы' },
  render: renderFocus,
});

export const QueriesJa = meta.story({
  name: 'Queries · ja',
  args: { value: '影の射手' },
  render: renderFocus,
});

export const ExtraTyping = meta.story({
  name: 'Typing',
  args: { value: '', placeholderKey: 'searchCombats', onChange: fn() },
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('searchbox', { name: 'Search combats' });
    await expect(canvas.queryByRole('button', { name: 'Clear search' })).toBeNull();
    await userEvent.type(input, 'ferry');
    await expect(args.onChange).toHaveBeenCalledTimes(5);
    await expect(args.onChange).toHaveBeenLastCalledWith('ferry');
    await expect(input).toHaveValue('ferry');
    await expect(canvas.getByRole('button', { name: 'Clear search' })).toBeVisible();
  },
});

export const ExtraMaxLength = meta.story({
  name: 'Typing stops at maxLength',
  args: { value: '', placeholderKey: 'searchCombats', maxLength: 4, onChange: fn() },
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('searchbox', { name: 'Search combats' });
    await expect(input).toHaveAttribute('maxlength', '4');
    await userEvent.type(input, 'ferry');
    await expect(args.onChange).toHaveBeenCalledTimes(4);
    await expect(args.onChange).toHaveBeenLastCalledWith('ferr');
    await expect(input).toHaveValue('ferr');
  },
});

export const ExtraClear = meta.story({
  name: 'Clear',
  args: { value: 'ferry', placeholderKey: 'searchCombats', onChange: fn(), onClear: fn() },
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('searchbox', { name: 'Search combats' });
    await userEvent.click(canvas.getByRole('button', { name: 'Clear search' }));
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('');
    await expect(args.onClear).toHaveBeenCalledOnce();
    await expect(input).toHaveValue('');
    await expect(input).toHaveFocus();
    await expect(canvas.queryByRole('button', { name: 'Clear search' })).toBeNull();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: type, Tab to ×, Enter',
  args: { value: '', placeholderKey: 'searchCombats', onChange: fn(), onClear: fn() },
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('searchbox', { name: 'Search combats' });
    await userEvent.tab();
    await expect(input).toHaveFocus();
    await userEvent.keyboard('orc');
    await expect(args.onChange).toHaveBeenLastCalledWith('orc');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Clear search' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onChange).toHaveBeenLastCalledWith('');
    await expect(args.onClear).toHaveBeenCalledOnce();
    await expect(input).toHaveValue('');
  },
});

export const ExtraEmptyPlaceholder = meta.story({
  name: 'Empty placeholder keeps the search label',
  args: { value: '', placeholder: '' },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('searchbox', { name: 'Search' });
    await expect(input).toHaveAttribute('placeholder', '');
    await expect(input).toHaveAttribute('aria-label', 'Search');
  },
});

export const ExtraFrameClick = meta.story({
  name: 'Clicking the frame focuses the input',
  args: { value: 'ferry' },
  play: async ({ canvas }) => {
    const input = canvas.getByRole('searchbox', { name: 'Search' });
    const frame = input.parentElement;
    if (frame) {
      await userEvent.pointer({ keys: '[MouseLeft]', target: frame, coords: { x: 4, y: 4 } });
    }
    await expect(input).toHaveFocus();
    input.blur();
    const icon = frame?.querySelector('svg');
    if (icon) {
      await userEvent.pointer({ keys: '[MouseLeft]', target: icon });
    }
    await expect(icon).not.toBeNull();
    await expect(input).toHaveFocus();
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { value: '', placeholderKey: 'searchCombats' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('searchbox', { name: 'Kämpfe durchsuchen' })).toBeVisible();
  },
});

export const ExtraLocaleEs = meta.story({
  name: 'Locale es',
  globals: { locale: 'es' },
  args: { value: '', placeholderKey: 'searchCombats' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('searchbox', { name: 'Buscar combates' })).toBeVisible();
  },
});

export const ExtraLocaleFr = meta.story({
  name: 'Locale fr',
  globals: { locale: 'fr' },
  args: { value: '', placeholderKey: 'searchCombats' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('searchbox', { name: 'Rechercher des combats' })).toBeVisible();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { value: '', placeholderKey: 'searchCombats' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('searchbox', { name: '戦闘を検索' })).toBeVisible();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { value: 'ferry' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('searchbox', { name: 'Поиск' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Очистить поиск' })).toBeVisible();
  },
});
