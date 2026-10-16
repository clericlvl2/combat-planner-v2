import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/Swatch.json';
import { Swatch } from './Swatch.tsx';
import type { SwatchProps } from './Swatch.tsx';

type ColorKey = keyof typeof en;

const colorKeys: readonly ColorKey[] = [
  'red',
  'orange',
  'ochre',
  'green',
  'teal',
  'blue',
  'brown',
  'grey',
];

interface SwatchCellProps extends Omit<SwatchProps, 'aria-label'> {
  label?: string;
}

function SwatchCell({ label, selected = false, onSelect, ...props }: SwatchCellProps) {
  const { t } = useTranslation('Swatch');
  const [isSelected, setSelected] = useState(selected);
  return (
    <Swatch
      {...props}
      aria-label={label ?? t(colorKeys[props.color] ?? 'red')}
      selected={isSelected}
      onSelect={(color) => {
        setSelected(true);
        onSelect?.(color);
      }}
    />
  );
}

const meta = preview.meta({
  title: 'Atoms/Swatch',
  component: SwatchCell,
  args: { color: 0, onSelect: fn() },
});

const renderTap = (args: SwatchCellProps) => <SwatchCell {...args} data-tap="" />;

export const SelectedM = meta.story({
  name: 'Selected, M',
  args: { color: 5, selected: true, size: 'M' },
});

export const Colour1 = meta.story({
  name: 'Colour 1',
  args: { color: 0 },
});

export const Colour2 = meta.story({
  name: 'Colour 2',
  args: { color: 1 },
});

export const Colour3 = meta.story({
  name: 'Colour 3',
  args: { color: 2 },
});

export const Colour4 = meta.story({
  name: 'Colour 4',
  args: { color: 3 },
});

export const Colour5 = meta.story({
  name: 'Colour 5',
  args: { color: 4 },
});

export const Colour6 = meta.story({
  name: 'Colour 6',
  args: { color: 5 },
});

export const Colour7 = meta.story({
  name: 'Colour 7',
  args: { color: 6 },
});

export const Colour8 = meta.story({
  name: 'Colour 8',
  args: { color: 7 },
});

export const Selected = meta.story({
  name: 'Selected',
  args: { color: 0, selected: true },
  play: async ({ canvas }) => {
    const swatch = canvas.getByRole('button', { name: 'Red' });
    await expect(swatch).toHaveAttribute('aria-pressed', 'true');
    await expect(swatch).toHaveAttribute('data-selected');
    await expect(swatch.querySelector('[data-check]')).not.toBeNull();
    await expect(getComputedStyle(swatch).boxShadow).toContain('rgb(35, 31, 28)');
  },
});

export const Tap = meta.story({
  name: 'Tap',
  args: { color: 5 },
  render: renderTap,
});

export const S = meta.story({
  name: 'S',
  args: { color: 5, selected: true, size: 'S' },
  play: async ({ canvas }) => {
    const swatch = canvas.getByRole('button', { name: 'Blue' });
    await expect(swatch.getBoundingClientRect().width).toBe(32);
    await expect(swatch.querySelector('svg')?.getAttribute('width')).toBe('16');
  },
});

export const M = meta.story({
  name: 'M',
  args: { color: 5, selected: true, size: 'M' },
  play: async ({ canvas }) => {
    const swatch = canvas.getByRole('button', { name: 'Blue' });
    await expect(swatch.getBoundingClientRect().width).toBe(40);
    await expect(swatch.querySelector('svg')?.getAttribute('width')).toBe('20');
  },
});

export const L = meta.story({
  name: 'L',
  args: { color: 5, selected: true, size: 'L' },
  play: async ({ canvas }) => {
    const swatch = canvas.getByRole('button', { name: 'Blue' });
    await expect(swatch.getBoundingClientRect().width).toBe(48);
    await expect(swatch.querySelector('svg')?.getAttribute('width')).toBe('24');
  },
});

export const ExtraSelect = meta.story({
  name: 'Select',
  args: { color: 4, onSelect: fn() },
  play: async ({ args, canvas }) => {
    const swatch = canvas.getByRole('button', { name: 'Teal' });
    await expect(swatch).toHaveAttribute('aria-pressed', 'false');
    await expect(swatch.querySelector('[data-check]')).toBeNull();
    await expect(getComputedStyle(swatch).boxShadow).toBe('none');
    await userEvent.click(swatch);
    await expect(args.onSelect).toHaveBeenCalledOnce();
    await expect(args.onSelect).toHaveBeenCalledWith(4);
    await expect(swatch).toHaveAttribute('aria-pressed', 'true');
    await expect(swatch).toHaveAttribute('data-selected');
    await expect(swatch.querySelector('[data-check]')).not.toBeNull();
    await expect(getComputedStyle(swatch).boxShadow).toContain('rgb(35, 31, 28)');
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter and Space',
  args: { color: 7, onSelect: fn() },
  play: async ({ args, canvas }) => {
    const swatch = canvas.getByRole('button', { name: 'Grey' });
    await userEvent.tab();
    await expect(swatch).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onSelect).toHaveBeenLastCalledWith(7);
    await userEvent.keyboard('[Space]');
    await expect(args.onSelect).toHaveBeenCalledTimes(2);
    await expect(swatch).toHaveAttribute('aria-pressed', 'true');
  },
});

export const ExtraDisabled = meta.story({
  name: 'Disabled',
  args: { color: 2, disabled: true, onSelect: fn() },
  play: async ({ args, canvas }) => {
    const swatch = canvas.getByRole('button', { name: 'Ochre' });
    await expect(swatch).toBeDisabled();
    await userEvent.click(swatch, { pointerEventsCheck: 0 });
    await expect(args.onSelect).not.toHaveBeenCalled();
    await expect(swatch).toHaveAttribute('aria-pressed', 'false');
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { color: 4, selected: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Бирюзовый' })).toBeVisible();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { color: 6, selected: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '茶色' })).toBeVisible();
  },
});
