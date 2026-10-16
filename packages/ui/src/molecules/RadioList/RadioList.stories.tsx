import preview from '#.storybook/preview';
import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import { locales } from '../../provider.tsx';
import { localeNames } from '../../storybook/withLocale.tsx';
import { RadioList } from './RadioList.tsx';
import type { RadioListOption, RadioListProps } from './RadioList.tsx';

interface RadioListCellProps extends Omit<
  RadioListProps<string>,
  'options' | 'aria-label' | 'onChange'
> {
  kind?: 'sort' | 'language';
  labels?: readonly string[];
  sub?: boolean;
  disabledValues?: readonly string[];
  tap?: number;
  onChange: (value: string) => void;
}

const stage = {
  boxSizing: 'content-box',
  width: 330,
  padding: 16,
  borderRadius: 12,
  background: 'var(--cp-color-surface)',
} as const;

const sortValues = ['newestFirst', 'lastPlayed', 'alphabetical'] as const;

function RadioListCell({
  kind = 'sort',
  labels,
  sub = false,
  disabledValues = [],
  tap,
  value: initialValue,
  onChange,
  ...props
}: RadioListCellProps) {
  const { t } = useTranslation('RadioList');
  const [value, setValue] = useState(initialValue);
  const frame = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (tap === undefined) return;
    frame.current
      ?.querySelector('[role="radiogroup"]')
      ?.children[tap]?.setAttribute('data-tap', '');
  }, [tap]);
  const options: RadioListOption<string>[] =
    kind === 'language'
      ? locales.map((locale) => ({ value: locale, label: localeNames[locale] }))
      : sortValues.map((option, index) => ({
          value: option,
          label: labels?.[index] ?? t(option),
          sub: sub ? t(`${option}Sub`) : undefined,
          disabled: disabledValues.includes(option) || undefined,
        }));
  return (
    <div style={stage} ref={frame}>
      <RadioList
        {...props}
        aria-label={kind === 'language' ? t('language') : t('sortCombats')}
        options={options}
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
  title: 'Molecules/RadioList',
  component: RadioListCell,
  args: { value: 'newestFirst', onChange: fn() },
});

export const Anatomy = meta.story({});

export const SortCombatsDefault = meta.story({
  name: 'Sort combats · default',
});

export const SortCombatsTap = meta.story({
  name: 'Sort combats · tap',
  args: { tap: 1 },
});

export const LanguageDefault = meta.story({
  name: 'Language · default',
  args: { kind: 'language', value: 'ru' },
});

export const LanguageTap = meta.story({
  name: 'Language · tap',
  args: { kind: 'language', value: 'ru', tap: 0 },
});

export const RadioListS = meta.story({
  name: 'RadioList · S',
  args: { size: 'S' },
});

export const RadioListM = meta.story({
  name: 'RadioList · M',
  args: { size: 'M' },
});

export const RadioListL = meta.story({
  name: 'RadioList · L',
  args: { size: 'L' },
});

export const SortCombatsDe = meta.story({
  name: 'Sort combats · de',
  args: {
    labels: ['Neueste zuerst', 'Zuletzt gespielt zuerst', 'Alphabetisch von A bis Z'],
    value: 'lastPlayed',
  },
});

export const SortCombatsRu = meta.story({
  name: 'Sort combats · ru',
  args: {
    labels: ['Сначала новые', 'Сначала последние сыгранные', 'По алфавиту от А до Я'],
    value: 'lastPlayed',
  },
});

export const ExtraTap = meta.story({
  name: 'Tap a row applies at once',
  play: async ({ args, canvas, canvasElement }) => {
    const lastPlayed = canvas.getByRole('radio', { name: 'Last played' });
    await userEvent.click(canvas.getByText('Last played'));
    await expect(args.onChange).toHaveBeenCalledWith('lastPlayed');
    await expect(lastPlayed).toBeChecked();
    const tinted = canvasElement.querySelector<HTMLElement>('[data-selected]');
    await expect(tinted).toHaveTextContent('Last played');
    await expect(tinted && getComputedStyle(tinted).backgroundColor).toBe('rgb(255, 244, 210)');
    await userEvent.click(canvas.getByText('Last played'));
    await expect(args.onChange).toHaveBeenCalledOnce();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: arrows, Space and Enter',
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('radiogroup', { name: 'Sort combats' })).toBeVisible();
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: 'Newest first' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(args.onChange).toHaveBeenLastCalledWith('lastPlayed');
    await expect(canvas.getByRole('radio', { name: 'Last played' })).toBeChecked();
    await userEvent.keyboard('{ArrowDown}');
    await expect(args.onChange).toHaveBeenLastCalledWith('alphabetical');
    await userEvent.keyboard('{ArrowUp}');
    await expect(args.onChange).toHaveBeenLastCalledWith('lastPlayed');
    await userEvent.keyboard('[Space]{Enter}');
    await expect(args.onChange).toHaveBeenCalledTimes(3);
  },
});

export const ExtraEnter = meta.story({
  name: 'Keyboard: Enter selects the focused row',
  play: async ({ args, canvas }) => {
    const alphabetical = canvas.getByRole('radio', { name: 'A–Z' });
    alphabetical.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onChange).toHaveBeenCalledWith('alphabetical');
    await expect(alphabetical).toBeChecked();
  },
});

export const ExtraDisabledOption = meta.story({
  name: 'Disabled option',
  args: { disabledValues: ['alphabetical'] },
  play: async ({ args, canvas }) => {
    const alphabetical = canvas.getByRole('radio', { name: 'A–Z' });
    await expect(alphabetical).toBeDisabled();
    await userEvent.click(canvas.getByText('A–Z'), { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(alphabetical).not.toBeChecked();
    await expect(canvas.getByRole('radio', { name: 'Newest first' })).toBeChecked();
  },
});

export const ExtraSubLine = meta.story({
  name: 'With sub lines',
  args: { sub: true },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radiogroup', { name: '戦闘の並べ替え' })).toBeVisible();
    await expect(canvas.getByRole('radio', { name: '新しい順' })).toBeChecked();
  },
});
