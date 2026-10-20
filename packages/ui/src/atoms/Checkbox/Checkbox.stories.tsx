import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/Checkbox.json';
import { Checkbox } from './Checkbox.tsx';
import type { CheckboxProps } from './Checkbox.tsx';
import { storyT } from '../../storybook/storyT.ts';

type LabelKey = keyof typeof en;

interface CheckboxCellProps extends Omit<CheckboxProps, 'label'> {
  labelKey?: LabelKey;
  label?: string;
}

function CheckboxCell({
  checked: initialChecked,
  onChange,
  labelKey,
  label,
  ...props
}: CheckboxCellProps) {
  const { t } = useTranslation('Checkbox');
  const [checked, setChecked] = useState(initialChecked);
  const text = label ?? (labelKey ? t(labelKey) : undefined);
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 16,
        borderRadius: 12,
        background: 'var(--cp-color-surface)',
      }}
    >
      <Checkbox
        {...props}
        label={text}
        aria-label={text ? undefined : t('select')}
        checked={checked}
        onChange={(next) => {
          setChecked(next);
          onChange(next);
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Atoms/Checkbox',
  component: CheckboxCell,
  args: { checked: false, onChange: fn() },
});

const renderTap = (args: CheckboxCellProps) => <CheckboxCell {...args} data-tap="" />;

export const AnatomySquareOn = meta.story({
  tags: ['visual'],
  name: 'Anatomy · square · on',
  args: { shape: 'square', checked: true },
});

export const SquareOff = meta.story({
  name: 'Square · off',
  args: { shape: 'square', checked: false },
});

export const VariantsStatesSquareOn = meta.story({
  name: 'Square · on',
  args: { shape: 'square', checked: true },
});

export const SquareTap = meta.story({
  name: 'Square · tap',
  args: { shape: 'square', checked: true },
  render: renderTap,
});

export const SquareDisabled = meta.story({
  name: 'Square · disabled',
  args: { shape: 'square', checked: false, disabled: true, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Checkbox');
    const box = canvas.getByRole('checkbox', { name: t('select') });
    await expect(box).toBeDisabled();
    await userEvent.click(box, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(box).not.toBeChecked();
  },
});

export const SquareOnDisabled = meta.story({
  name: 'Square · on, disabled',
  args: { shape: 'square', checked: true, disabled: true },
});

export const RoundOff = meta.story({
  name: 'Round · off',
  args: { shape: 'round', checked: false },
});

export const RoundOnDazed = meta.story({
  name: 'Round · on, dazed',
  args: { shape: 'round', checked: true, condition: 'dazed' },
});

export const RoundOnHampered = meta.story({
  name: 'Round · on, hampered',
  args: { shape: 'round', checked: true, condition: 'hampered' },
});

export const SSquare = meta.story({
  tags: ['visual'],
  name: 'S · square',
  args: { size: 'S', shape: 'square', checked: true },
});

export const SRound = meta.story({
  name: 'S · round',
  args: { size: 'S', shape: 'round', checked: true },
});

export const MSquare = meta.story({
  name: 'M · square',
  args: { size: 'M', shape: 'square', checked: true },
});

export const MRound = meta.story({
  name: 'M · round',
  args: { size: 'M', shape: 'round', checked: true },
});

export const LSquare = meta.story({
  name: 'L · square',
  args: { size: 'L', shape: 'square', checked: true },
});

export const LRound = meta.story({
  name: 'L · round',
  args: { size: 'L', shape: 'round', checked: true },
});

export const Charmed = meta.story({
  name: 'charmed',
  args: { shape: 'round', checked: true, condition: 'charmed' },
});

export const Confused = meta.story({
  name: 'confused',
  args: { shape: 'round', checked: true, condition: 'confused' },
});

export const Dazed = meta.story({
  name: 'dazed',
  args: { shape: 'round', checked: true, condition: 'dazed' },
});

export const Fear = meta.story({
  name: 'fear',
  args: { shape: 'round', checked: true, condition: 'fear' },
});

export const Helpless = meta.story({
  name: 'helpless',
  args: { shape: 'round', checked: true, condition: 'helpless' },
});

export const Hampered = meta.story({
  name: 'hampered',
  args: { shape: 'round', checked: true, condition: 'hampered' },
});

export const Shocked = meta.story({
  name: 'shocked',
  args: { shape: 'round', checked: true, condition: 'shocked' },
});

export const Stuck = meta.story({
  name: 'stuck',
  args: { shape: 'round', checked: true, condition: 'stuck' },
});

export const Stunned = meta.story({
  name: 'stunned',
  args: { shape: 'round', checked: true, condition: 'stunned' },
});

export const Vulnerable = meta.story({
  name: 'vulnerable',
  args: { shape: 'round', checked: true, condition: 'vulnerable' },
});

export const Weakened = meta.story({
  name: 'weakened',
  args: { shape: 'round', checked: true, condition: 'weakened' },
});

export const ExtraToggle = meta.story({
  name: 'Toggle on tap',
  args: { checked: false, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Checkbox');
    const box = canvas.getByRole('checkbox', { name: t('select') });
    await userEvent.click(box);
    await expect(args.onChange).toHaveBeenLastCalledWith(true);
    await expect(box).toBeChecked();
    await userEvent.click(box);
    await expect(args.onChange).toHaveBeenLastCalledWith(false);
    await expect(box).not.toBeChecked();
  },
});

export const ExtraLabelClick = meta.story({
  name: 'Label click toggles',
  args: { checked: false, labelKey: 'tagUndead', onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Checkbox');
    await userEvent.click(canvas.getByText(t('tagUndead')));
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith(true);
    await expect(canvas.getByRole('checkbox', { name: t('tagUndead') })).toBeChecked();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Space toggles',
  args: { checked: false, labelKey: 'tagUndead', onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Checkbox');
    const box = canvas.getByRole('checkbox', { name: t('tagUndead') });
    await userEvent.tab();
    await expect(box).toHaveFocus();
    await userEvent.keyboard('[Space]');
    await expect(args.onChange).toHaveBeenLastCalledWith(true);
    await expect(box).toBeChecked();
    await userEvent.keyboard('[Space]');
    await expect(args.onChange).toHaveBeenLastCalledWith(false);
    await expect(box).not.toBeChecked();
  },
});

export const ExtraDisabledLabel = meta.story({
  name: 'Disabled with label',
  args: { checked: true, labelKey: 'tagUndead', disabled: true, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Checkbox');
    await userEvent.click(canvas.getByText(t('tagUndead')), { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByRole('checkbox', { name: t('tagUndead') })).toBeChecked();
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { checked: true, labelKey: 'tagUndead' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox', { name: 'Untote' })).toBeChecked();
  },
});

export const ExtraLocaleEs = meta.story({
  name: 'Locale es',
  globals: { locale: 'es' },
  args: { checked: true, labelKey: 'tagUndead' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox', { name: 'No muertos' })).toBeChecked();
  },
});

export const ExtraLocaleFr = meta.story({
  name: 'Locale fr',
  globals: { locale: 'fr' },
  args: { checked: true, labelKey: 'tagUndead' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox', { name: 'Morts-vivants' })).toBeChecked();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { checked: true, labelKey: 'tagUndead' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox', { name: 'アンデッド' })).toBeChecked();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { checked: true, labelKey: 'tagUndead' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('checkbox', { name: 'Нежить' })).toBeChecked();
  },
});
