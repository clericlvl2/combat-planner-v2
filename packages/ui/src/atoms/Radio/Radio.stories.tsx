import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/Radio.json';
import { Radio } from './Radio.tsx';
import type { RadioProps } from './Radio.tsx';
import { storyT } from '../../storybook/storyT.ts';

type LabelKey = keyof typeof en;

interface RadioCellProps extends Omit<RadioProps, 'label' | 'name' | 'value'> {
  labelKey?: LabelKey;
  name?: string;
  value?: string;
}

const stage = {
  display: 'inline-flex',
  flexDirection: 'column',
  padding: 16,
  borderRadius: 12,
  background: 'var(--cp-color-surface)',
} as const;

function RadioCell({
  checked: initialChecked,
  onChange,
  labelKey,
  name = 'sort',
  value = 'newestFirst',
  ...props
}: RadioCellProps) {
  const { t } = useTranslation('Radio');
  const [checked, setChecked] = useState(initialChecked);
  const text = labelKey ? t(labelKey) : undefined;
  return (
    <div style={stage}>
      <Radio
        {...props}
        name={name}
        value={value}
        label={text}
        aria-label={text ? undefined : t('select')}
        checked={checked}
        onChange={(next) => {
          setChecked(true);
          onChange(next);
        }}
      />
    </div>
  );
}

const sortOptions = ['newestFirst', 'lastPlayed'] as const;

function RadioGroupCell({ checked, onChange, disabled }: RadioCellProps) {
  const { t } = useTranslation('Radio');
  const [selected, setSelected] = useState<string>(checked ? 'lastPlayed' : 'newestFirst');
  return (
    <div style={stage} role="radiogroup">
      {sortOptions.map((option) => (
        <Radio
          key={option}
          name="sort"
          value={option}
          label={t(option)}
          disabled={disabled}
          checked={selected === option}
          onChange={(next) => {
            setSelected(next);
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

const meta = preview.meta({
  title: 'Atoms/Radio',
  component: RadioCell,
  args: { checked: false, onChange: fn() },
});

const renderTap = (args: RadioCellProps) => <RadioCell {...args} data-tap="" />;

const renderGroup = (args: RadioCellProps) => <RadioGroupCell {...args} />;

export const OnM = meta.story({
  tags: ['visual'],
  name: 'On, M',
  args: { checked: true, size: 'M' },
});

export const Off = meta.story({
  name: 'Off',
  args: { checked: false },
});

export const On = meta.story({
  name: 'On',
  args: { checked: true },
});

export const Tap = meta.story({
  name: 'Tap',
  args: { checked: true },
  render: renderTap,
});

export const Disabled = meta.story({
  name: 'Disabled',
  args: { checked: false, disabled: true, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Radio');
    const radio = canvas.getByRole('radio', { name: t('select') });
    await expect(radio).toBeDisabled();
    await userEvent.click(radio, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(radio).not.toBeChecked();
  },
});

export const OnDisabled = meta.story({
  name: 'On, disabled',
  args: { checked: true, disabled: true },
});

export const S = meta.story({
  name: 'S',
  args: { checked: true, size: 'S' },
});

export const M = meta.story({
  name: 'M',
  args: { checked: true, size: 'M' },
});

export const L = meta.story({
  tags: ['visual'],
  name: 'L',
  args: { checked: true, size: 'L' },
});

export const ExtraSelect = meta.story({
  name: 'Tap selects',
  args: { checked: false, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Radio');
    const radio = canvas.getByRole('radio', { name: t('select') });
    await userEvent.click(radio);
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('newestFirst');
    await expect(radio).toBeChecked();
    await userEvent.click(radio);
    await expect(args.onChange).toHaveBeenCalledOnce();
  },
});

export const ExtraLabelClick = meta.story({
  name: 'Label click selects',
  args: { checked: false, onChange: fn() },
  render: renderGroup,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Radio');
    await expect(canvas.getByRole('radio', { name: t('newestFirst') })).toBeChecked();
    await userEvent.click(canvas.getByText(t('lastPlayed')));
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith('lastPlayed');
    await expect(canvas.getByRole('radio', { name: t('lastPlayed') })).toBeChecked();
    await expect(canvas.getByRole('radio', { name: t('newestFirst') })).not.toBeChecked();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Space selects',
  args: { checked: false, labelKey: 'lastPlayed', value: 'lastPlayed', onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Radio');
    const radio = canvas.getByRole('radio', { name: t('lastPlayed') });
    await userEvent.tab();
    await expect(radio).toHaveFocus();
    await userEvent.keyboard('[Space]');
    await expect(args.onChange).toHaveBeenCalledWith('lastPlayed');
    await expect(radio).toBeChecked();
  },
});

export const ExtraGroupArrows = meta.story({
  name: 'Group: arrow keys move the selection',
  args: { checked: false, onChange: fn() },
  render: renderGroup,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Radio');
    await userEvent.tab();
    await expect(canvas.getByRole('radio', { name: t('newestFirst') })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(args.onChange).toHaveBeenLastCalledWith('lastPlayed');
    await expect(canvas.getByRole('radio', { name: t('lastPlayed') })).toBeChecked();
  },
});

export const ExtraDisabledLabel = meta.story({
  name: 'Disabled group',
  args: { checked: false, disabled: true, onChange: fn() },
  render: renderGroup,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Radio');
    await userEvent.click(canvas.getByText(t('lastPlayed')), { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByRole('radio', { name: t('newestFirst') })).toBeChecked();
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { checked: true },
  render: renderGroup,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'Zuletzt gespielt' })).toBeChecked();
  },
});

export const ExtraLocaleEs = meta.story({
  name: 'Locale es',
  globals: { locale: 'es' },
  args: { checked: true },
  render: renderGroup,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'Última partida' })).toBeChecked();
  },
});

export const ExtraLocaleFr = meta.story({
  name: 'Locale fr',
  globals: { locale: 'fr' },
  args: { checked: true },
  render: renderGroup,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'Dernière partie' })).toBeChecked();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { checked: true },
  render: renderGroup,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: '最近プレイ順' })).toBeChecked();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { checked: true },
  render: renderGroup,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'Последняя игра' })).toBeChecked();
  },
});
