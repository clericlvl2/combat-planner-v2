import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/Swatch.json';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { Swatch } from './Swatch.tsx';
import type { SwatchProps, SwatchSize } from './Swatch.tsx';
import { base, combatColors } from '../../theme.ts';

const rgb = (hex: string) => {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
};

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

type SwatchCellProps = Omit<SwatchProps, 'aria-label'>;

function SwatchCell({ selected = false, onSelect, ...props }: SwatchCellProps) {
  const { t } = useTranslation('Swatch');
  const [isSelected, setSelected] = useState(selected);
  return (
    <Swatch
      {...props}
      aria-label={t(colorKeys[props.color] ?? 'red')}
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

const states = ['default', 'selected', 'disabled', 'focus', 'focus selected', 'tap'] as const;
type State = (typeof states)[number];

const row = (size: SwatchSize) => ({
  label: size,
  render: (state: State) => (
    <SwatchCell
      color={5}
      size={size}
      selected={state === 'selected' || state === 'focus selected'}
      disabled={state === 'disabled'}
      data-focus={state === 'focus' || state === 'focus selected' ? '' : undefined}
      data-tap={state === 'tap' ? '' : undefined}
      onSelect={fn()}
    />
  ),
});

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => <StateGrid columns={states} rows={[row('S'), row('M'), row('L')]} />,
});

export const SizesSetSquareAndCheck = meta.story({
  tags: ['!dev'],
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <SwatchCell color={5} selected size="S" />
      <SwatchCell color={5} selected size="M" />
      <SwatchCell color={5} selected size="L" />
    </div>
  ),
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Swatch');
    const swatches = canvas.getAllByRole('button', { name: t('blue') });
    const widths = swatches.map((swatch) => swatch.getBoundingClientRect().width);
    const checks = swatches.map((swatch) => swatch.querySelector('svg')?.getAttribute('width'));
    await expect(widths).toEqual([32, 40, 48]);
    await expect(checks).toEqual(['16', '20', '24']);
  },
});

export const GreyFill = meta.story({
  tags: ['!dev'],
  args: { color: 7 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Swatch');
    const swatch = canvas.getByRole('button', { name: t('grey') });
    await expect(swatch.style.getPropertyValue('--swatch-fill')).toBe(combatColors[7]);
  },
});

export const SelectedIsPressed = meta.story({
  tags: ['!dev'],
  args: { color: 0, selected: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Swatch');
    const swatch = canvas.getByRole('button', { name: t('red') });
    await expect(swatch).toHaveAttribute('aria-pressed', 'true');
    await expect(swatch).toHaveAttribute('data-selected');
    await expect(swatch.querySelector('[data-check]')).not.toBeNull();
    await expect(getComputedStyle(swatch).boxShadow).toContain(rgb(base.ink));
  },
});

export const ClickSelects = meta.story({
  tags: ['!dev'],
  args: { color: 4, onSelect: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Swatch');
    const swatch = canvas.getByRole('button', { name: t('teal') });
    await expect(swatch).toHaveAttribute('aria-pressed', 'false');
    await expect(swatch.querySelector('[data-check]')).toBeNull();
    await expect(getComputedStyle(swatch).boxShadow).toBe('none');
    await userEvent.click(swatch);
    await expect(args.onSelect).toHaveBeenCalledOnce();
    await expect(args.onSelect).toHaveBeenCalledWith(4);
    await expect(swatch).toHaveAttribute('aria-pressed', 'true');
    await expect(swatch).toHaveAttribute('data-selected');
    await expect(swatch.querySelector('[data-check]')).not.toBeNull();
    await expect(getComputedStyle(swatch).boxShadow).toContain(rgb(base.ink));
  },
});

export const EnterAndSpaceSelect = meta.story({
  tags: ['!dev'],
  args: { color: 7, onSelect: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Swatch');
    const swatch = canvas.getByRole('button', { name: t('grey') });
    await userEvent.tab();
    await expect(swatch).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onSelect).toHaveBeenLastCalledWith(7);
    await userEvent.keyboard('[Space]');
    await expect(args.onSelect).toHaveBeenCalledTimes(2);
    await expect(swatch).toHaveAttribute('aria-pressed', 'true');
  },
});

export const DisabledIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { color: 2, disabled: true, onSelect: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Swatch');
    const swatch = canvas.getByRole('button', { name: t('ochre') });
    await expect(swatch).toBeDisabled();
    await userEvent.click(swatch, { pointerEventsCheck: 0 });
    await expect(args.onSelect).not.toHaveBeenCalled();
    await expect(swatch).toHaveAttribute('aria-pressed', 'false');
  },
});
