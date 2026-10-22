import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import { locales } from '../../provider.tsx';
import { localeNames } from '../../storybook/withLocale.tsx';
import { RadioList } from './RadioList.tsx';
import type { RadioListOption, RadioListProps } from './RadioList.tsx';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';

interface RadioListCellProps extends Omit<
  RadioListProps<string>,
  'options' | 'aria-label' | 'onChange'
> {
  kind?: 'sort' | 'language';
  labels?: readonly string[];
  sub?: boolean;
  disabledValues?: readonly string[];
  onChange: (value: string) => void;
}

const stage = {
  boxSizing: 'border-box',
  width: 362,
  maxWidth: '100%',
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
  value: initialValue,
  onChange,
  ...props
}: RadioListCellProps) {
  const { t } = useTranslation('RadioList');
  const [value, setValue] = useState(initialValue);
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
    <div style={stage}>
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

export const Default = meta.story({ tags: ['visual'] });

export const Language = meta.story({
  args: { kind: 'language', value: 'ru' },
});

const sizeColumns = ['Default'] as const;

const sizeRows = (['S', 'M', 'L'] as const).map((size) => ({
  label: size,
  render: () => <RadioListCell size={size} value="newestFirst" onChange={() => {}} />,
}));

export const AllSizes = meta.story({
  tags: ['visual'],
  render: () => <StateGrid rows={sizeRows} columns={sizeColumns} />,
});

export const TapAppliesAtOnce = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RadioList');
    const lastPlayed = canvas.getByRole('radio', { name: t('lastPlayed') });
    await userEvent.click(canvas.getByText(t('lastPlayed')));
    await expect(args.onChange).toHaveBeenCalledWith('lastPlayed');
    await expect(lastPlayed).toBeChecked();
    const tinted = canvasElement.querySelector<HTMLElement>('[data-selected]');
    await expect(tinted).toHaveTextContent(t('lastPlayed'));
    await expect(tinted && getComputedStyle(tinted).backgroundColor).toBe('rgb(255, 244, 210)');
    await userEvent.click(canvas.getByText(t('lastPlayed')));
    await expect(args.onChange).toHaveBeenCalledOnce();
  },
});

export const ArrowsMoveTheSelection = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'RadioList');
    await expect(canvas.getByRole('radiogroup', { name: t('sortCombats') })).toBeVisible();
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: t('newestFirst') })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(args.onChange).toHaveBeenLastCalledWith('lastPlayed');
    await expect(canvas.getByRole('radio', { name: t('lastPlayed') })).toBeChecked();
    await userEvent.keyboard('{ArrowDown}');
    await expect(args.onChange).toHaveBeenLastCalledWith('alphabetical');
    await userEvent.keyboard('{ArrowUp}');
    await expect(args.onChange).toHaveBeenLastCalledWith('lastPlayed');
    await userEvent.keyboard('[Space]{Enter}');
    await expect(args.onChange).toHaveBeenCalledTimes(3);
  },
});

export const EnterSelectsFocusedRow = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'RadioList');
    const alphabetical = canvas.getByRole('radio', { name: t('alphabetical') });
    alphabetical.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onChange).toHaveBeenCalledWith('alphabetical');
    await expect(alphabetical).toBeChecked();
  },
});

export const DisabledOption = meta.story({
  args: { disabledValues: ['alphabetical'] },
});

export const LongLabels = meta.story({
  args: {
    labels: [
      'Сначала новые бои, созданные недавно',
      'Сначала последние сыгранные бои за неделю',
      'По алфавиту от А до Я по названию боя',
    ],
    sub: true,
    value: 'lastPlayed',
  },
});

export const DisabledOptionIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { disabledValues: ['alphabetical'] },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'RadioList');
    const alphabetical = canvas.getByRole('radio', { name: t('alphabetical') });
    await expect(alphabetical).toBeDisabled();
    await userEvent.click(canvas.getByText(t('alphabetical')), { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(alphabetical).not.toBeChecked();
    await expect(canvas.getByRole('radio', { name: t('newestFirst') })).toBeChecked();
  },
});

export const WithSubLines = meta.story({
  args: { sub: true },
});
