import preview from '#.storybook/preview';
import { useState } from 'react';
import { expect, fn, userEvent } from 'storybook/test';
import type { CombatColor } from '../../atoms/Swatch/Swatch.tsx';
import { SwatchRow } from './SwatchRow.tsx';
import type { SwatchRowProps } from './SwatchRow.tsx';

interface SwatchRowCellProps extends SwatchRowProps {
  width?: number;
}

function SwatchRowCell({
  value: initialValue,
  onChange,
  width = 330,
  ...props
}: SwatchRowCellProps) {
  const [value, setValue] = useState(initialValue);
  return (
    <div style={{ width: width + 24, padding: 12, background: 'var(--cp-color-surface)' }}>
      <SwatchRow
        {...props}
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    </div>
  );
}

const firstColor: CombatColor = 0;

const meta = preview.meta({
  title: 'Molecules/SwatchRow',
  component: SwatchRowCell,
  args: { value: firstColor, onChange: fn() },
});

const renderTap = (args: SwatchRowCellProps) => <SwatchRowCell {...args} data-tap={5} />;

export const Anatomy = meta.story({
  args: { value: 2 },
});

export const CombatColorDefault = meta.story({
  name: 'Combat color · default',
  args: { value: 0 },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('button')).toHaveLength(8);
    await expect(canvas.getByRole('button', { name: 'Red' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
});

export const CombatColorTap = meta.story({
  name: 'Combat color · tap',
  args: { value: 0 },
  render: renderTap,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Blue' })).toHaveAttribute('data-tap');
    await expect(canvas.getByRole('button', { name: 'Red' })).toHaveAttribute('data-selected');
  },
});

export const Widths296Wide = meta.story({
  name: 'Widths · 296 wide',
  args: { value: 4, width: 296 },
  play: async ({ canvas }) => {
    const teal = canvas.getByRole('button', { name: 'Teal' });
    await expect(teal.getBoundingClientRect().width).toBe(30);
    await expect(teal.getBoundingClientRect().height).toBe(30);
    await expect(getComputedStyle(teal).boxShadow).toContain('rgb(35, 31, 28)');
  },
});

export const Widths366Wide = meta.story({
  name: 'Widths · 366 wide',
  parameters: {
    geometry: {
      overflow:
        'the story pins the row to the 366 px phone content width inside the wider story padding',
    },
  },
  args: { value: 4, width: 366 },
  play: async ({ canvas }) => {
    const teal = canvas.getByRole('button', { name: 'Teal' });
    await expect(teal.getBoundingClientRect().width).toBeCloseTo(38.75, 1);
    await expect(teal.querySelector('svg')?.getAttribute('width')).toBe('20');
  },
});

export const ExtraSelect = meta.story({
  name: 'Select moves the ring',
  args: { value: 0, onChange: fn() },
  play: async ({ args, canvas }) => {
    const red = canvas.getByRole('button', { name: 'Red' });
    const blue = canvas.getByRole('button', { name: 'Blue' });
    await userEvent.click(blue);
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith(5);
    await expect(blue).toHaveAttribute('aria-pressed', 'true');
    await expect(blue).toHaveAttribute('data-selected');
    await expect(red).toHaveAttribute('aria-pressed', 'false');
    await expect(red).not.toHaveAttribute('data-selected');
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter and Space',
  args: { value: 0, onChange: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Orange' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onChange).toHaveBeenLastCalledWith(1);
    await userEvent.tab();
    await userEvent.keyboard('[Space]');
    await expect(args.onChange).toHaveBeenLastCalledWith(2);
    await expect(canvas.getByRole('button', { name: 'Ochre' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
});

export const ExtraDisabled = meta.story({
  name: 'Disabled',
  args: { value: 3, disabled: true, onChange: fn() },
  play: async ({ args, canvas }) => {
    const blue = canvas.getByRole('button', { name: 'Blue' });
    await expect(blue).toBeDisabled();
    await userEvent.click(blue, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { value: 4 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('group', { name: 'Цвет боя' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Бирюзовый' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
});
