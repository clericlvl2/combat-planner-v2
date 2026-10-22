import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/SearchField.json';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { SearchField } from './SearchField.tsx';
import type { SearchFieldProps, SearchFieldSize } from './SearchField.tsx';

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

const states = ['empty', 'filled', 'focus', 'disabled'] as const;
type State = (typeof states)[number];

const row = (size: SearchFieldSize) => ({
  label: size,
  render: (state: State) => (
    <SearchFieldCell
      size={size}
      placeholderKey="searchCombats"
      value={state === 'filled' ? 'ferry' : ''}
      disabled={state === 'disabled'}
      data-focus={state === 'focus' ? '' : undefined}
      onChange={fn()}
    />
  ),
});

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => <StateGrid columns={states} rows={[row('S'), row('M'), row('L')]} />,
});

export const LongQuery = meta.story({
  tags: ['visual'],
  args: { value: 'brother tomas of the silver lantern' },
  render: renderFocus,
});

export const DisabledIgnoresTyping = meta.story({
  tags: ['!dev'],
  args: { value: '', placeholderKey: 'searchCombats', disabled: true, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SearchField');
    const input = canvas.getByRole('searchbox', { name: t('searchCombats') });
    await expect(input).toBeDisabled();
    await userEvent.type(input, 'ferry', { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(input).toHaveValue('');
  },
});

export const TypingShowsClear = meta.story({
  tags: ['!dev'],
  args: { value: '', placeholderKey: 'searchCombats', onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SearchField');
    const input = canvas.getByRole('searchbox', { name: t('searchCombats') });
    await expect(canvas.queryByRole('button', { name: t('clear') })).toBeNull();
    await userEvent.type(input, 'ferry');
    await expect(args.onChange).toHaveBeenCalledTimes(5);
    await expect(args.onChange).toHaveBeenLastCalledWith('ferry');
    await expect(input).toHaveValue('ferry');
    await expect(canvas.getByRole('button', { name: t('clear') })).toBeVisible();
  },
});

export const TypingStopsAtMaxLength = meta.story({
  tags: ['!dev'],
  args: { value: '', placeholderKey: 'searchCombats', maxLength: 4, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SearchField');
    const input = canvas.getByRole('searchbox', { name: t('searchCombats') });
    await expect(input).toHaveAttribute('maxlength', '4');
    await userEvent.type(input, 'ferry');
    await expect(args.onChange).toHaveBeenCalledTimes(4);
    await expect(args.onChange).toHaveBeenLastCalledWith('ferr');
    await expect(input).toHaveValue('ferr');
  },
});

export const ClearEmptiesAndFocuses = meta.story({
  tags: ['!dev'],
  args: { value: 'ferry', placeholderKey: 'searchCombats', onChange: fn(), onClear: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SearchField');
    const input = canvas.getByRole('searchbox', { name: t('searchCombats') });
    await userEvent.click(canvas.getByRole('button', { name: t('clear') }));
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('');
    await expect(args.onClear).toHaveBeenCalledOnce();
    await expect(input).toHaveValue('');
    await expect(input).toHaveFocus();
    await expect(canvas.queryByRole('button', { name: t('clear') })).toBeNull();
  },
});

export const TabToClearAndEnter = meta.story({
  tags: ['!dev'],
  args: { value: '', placeholderKey: 'searchCombats', onChange: fn(), onClear: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SearchField');
    const input = canvas.getByRole('searchbox', { name: t('searchCombats') });
    await userEvent.tab();
    await expect(input).toHaveFocus();
    await userEvent.keyboard('orc');
    await expect(args.onChange).toHaveBeenLastCalledWith('orc');
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: t('clear') })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onChange).toHaveBeenLastCalledWith('');
    await expect(args.onClear).toHaveBeenCalledOnce();
    await expect(input).toHaveValue('');
  },
});

export const EmptyPlaceholderKeepsLabel = meta.story({
  tags: ['!dev'],
  args: { value: '', placeholder: '' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SearchField');
    const input = canvas.getByRole('searchbox', { name: t('search') });
    await expect(input).toHaveAttribute('placeholder', '');
    await expect(input).toHaveAttribute('aria-label', t('search'));
  },
});

export const FrameClickFocusesInput = meta.story({
  tags: ['!dev'],
  args: { value: 'ferry' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SearchField');
    const input = canvas.getByRole('searchbox', { name: t('search') });
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
