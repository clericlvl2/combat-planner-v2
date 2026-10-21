import preview from '#.storybook/preview';
import { useState } from 'react';
import { expect, fn, userEvent } from 'storybook/test';
import type { CombatColor } from '../../atoms/Swatch/Swatch.tsx';
import { SwatchRow } from './SwatchRow.tsx';
import type { SwatchRowProps } from './SwatchRow.tsx';
import { storyT } from '../../storybook/storyT.ts';

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

export const Default = meta.story({
  tags: ['visual'],
  args: { value: 2 },
});

export const LastColourSelected = meta.story({
  args: { value: 7 },
});

export const HasEightColours = meta.story({
  tags: ['!dev'],
  args: { value: 0 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SwatchRow');
    await expect(canvas.getAllByRole('button')).toHaveLength(8);
    await expect(canvas.getByRole('button', { name: t('red') })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
});

export const NarrowRow = meta.story({
  tags: ['visual'],
  args: { value: 4, width: 296 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SwatchRow');
    const teal = canvas.getByRole('button', { name: t('teal') });
    await expect(teal.getBoundingClientRect().width).toBe(30);
    await expect(teal.getBoundingClientRect().height).toBe(30);
    await expect(getComputedStyle(teal).boxShadow).toContain('rgb(35, 31, 28)');
  },
});

export const WideRow = meta.story({
  tags: ['!dev'],
  parameters: {
    geometry: {
      overflow:
        'the story pins the row to the 366 px phone content width inside the wider story padding',
    },
  },
  args: { value: 4, width: 366 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'SwatchRow');
    const teal = canvas.getByRole('button', { name: t('teal') });
    await expect(teal.getBoundingClientRect().width).toBeCloseTo(38.75, 1);
    await expect(teal.querySelector('svg')?.getAttribute('width')).toBe('20');
  },
});

export const SelectMovesTheRing = meta.story({
  tags: ['!dev'],
  args: { value: 0, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SwatchRow');
    const red = canvas.getByRole('button', { name: t('red') });
    const blue = canvas.getByRole('button', { name: t('blue') });
    await userEvent.click(blue);
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith(5);
    await expect(blue).toHaveAttribute('aria-pressed', 'true');
    await expect(blue).toHaveAttribute('data-selected');
    await expect(red).toHaveAttribute('aria-pressed', 'false');
    await expect(red).not.toHaveAttribute('data-selected');
  },
});

export const DisabledIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { value: 3, disabled: true, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'SwatchRow');
    const blue = canvas.getByRole('button', { name: t('blue') });
    await expect(blue).toBeDisabled();
    await userEvent.click(blue, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});
