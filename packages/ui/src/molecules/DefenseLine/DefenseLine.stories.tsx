import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { base } from '../../theme.ts';
import { DefenseLine } from './DefenseLine.tsx';
import type { DefenseLineProps } from './DefenseLine.tsx';
import { storyT } from '../../storybook/storyT.ts';

function DefenseLineCell(props: DefenseLineProps) {
  return (
    <div
      style={{
        display: 'flex',
        width: props.variant === 'squares' ? 160 : 260,
        padding: 16,
        background: base.surface,
      }}
    >
      <DefenseLine {...props} />
    </div>
  );
}

const meta = preview.meta({
  title: 'Molecules/DefenseLine',
  component: DefenseLineCell,
  args: { variant: 'line', ac: 16, pd: 14, md: 19 },
});

const rgb = (hex: string) => {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
};

const rootOf = (canvasElement: HTMLElement) => {
  const root = canvasElement.querySelector<HTMLElement>('[data-variant]');
  if (!root) throw new Error('DefenseLine not rendered');
  return root;
};

const valuesOf = (canvasElement: HTMLElement) =>
  (rootOf(canvasElement).textContent ?? '')
    .split('\u00A0· ')
    .map((pair) => pair.split('\u00A0')[1]);

const linesOf = (root: HTMLElement) => {
  const node = root.firstChild;
  const text = node?.textContent ?? '';
  const lines = new Map<number, string>();
  for (let index = 0; index < text.length; index += 1) {
    const range = document.createRange();
    range.setStart(node as Node, index);
    range.setEnd(node as Node, index + 1);
    const top = Math.round(range.getBoundingClientRect().top);
    lines.set(top, (lines.get(top) ?? '') + text.charAt(index));
  }
  return [...lines.values()].map((line) => line.trim());
};

const squareValuesOf = (canvasElement: HTMLElement) =>
  [...canvasElement.querySelectorAll<HTMLElement>('[data-stat]')].map(
    (square) => square.lastElementChild?.textContent,
  );

export const Anatomy = meta.story({
  args: { variant: 'line', ac: 16, pd: 14, md: 19 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'DefenseLine');
    await expect(rootOf(canvasElement).textContent).toBe(
      `${t('ac')} 16 · ${t('pd')} 14 · ${t('md')} 19`,
    );
    await expect(valuesOf(canvasElement)).toEqual(['16', '14', '19']);
    await expect(getComputedStyle(rootOf(canvasElement)).color).toBe(rgb(base.secondary));
  },
});

export const Line = meta.story({
  name: 'Line',
  args: { variant: 'line', ac: 16, pd: 14, md: 19 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'DefenseLine');
    await expect(rootOf(canvasElement).textContent).toBe(
      `${t('ac')} 16 · ${t('pd')} 14 · ${t('md')} 19`,
    );
    await expect(valuesOf(canvasElement)).toEqual(['16', '14', '19']);
  },
});

export const Squares = meta.story({
  name: 'Squares',
  args: { variant: 'squares', ac: 18, pd: 16, md: 12 },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'DefenseLine');
    await expect(canvas.getByRole('group')).toHaveAttribute(
      'aria-label',
      `${t('ac')} 18 · ${t('pd')} 16 · ${t('md')} 12`,
    );
    await expect(squareValuesOf(canvasElement)).toEqual(['18', '16', '12']);
    await expect(canvasElement.querySelectorAll('[data-stat]')).toHaveLength(3);
  },
});

export const LineTwoDigits = meta.story({
  name: 'Line, two digits',
  args: { variant: 'line', ac: 24, pd: 22, md: 20 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'DefenseLine');
    await expect(rootOf(canvasElement).textContent).toBe(
      `${t('ac')} 24 · ${t('pd')} 22 · ${t('md')} 20`,
    );
    await expect(valuesOf(canvasElement)).toEqual(['24', '22', '20']);
  },
});

export const LineThreeDigits = meta.story({
  name: 'Line, three digits',
  args: { variant: 'line', ac: 105, pd: 99, md: 120 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'DefenseLine');
    await expect(rootOf(canvasElement).textContent).toBe(
      `${t('ac')} 105 · ${t('pd')} 99 · ${t('md')} 120`,
    );
    await expect(valuesOf(canvasElement)).toEqual(['105', '99', '120']);
  },
});

export const LineMissingValue = meta.story({
  name: 'Line, missing value',
  args: { variant: 'line', ac: 16, pd: null, md: 19 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'DefenseLine');
    await expect(rootOf(canvasElement).textContent).toBe(
      `${t('ac')} 16 · ${t('pd')} — · ${t('md')} 19`,
    );
    await expect(valuesOf(canvasElement)).toEqual(['16', '—', '19']);
  },
});

export const SquaresTwoDigits = meta.story({
  name: 'Squares, two digits',
  args: { variant: 'squares', ac: 30, pd: 28, md: 26 },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'DefenseLine');
    await expect(canvas.getByRole('group')).toHaveAttribute(
      'aria-label',
      `${t('ac')} 30 · ${t('pd')} 28 · ${t('md')} 26`,
    );
    await expect(squareValuesOf(canvasElement)).toEqual(['30', '28', '26']);
  },
});

export const SquaresMissingValue = meta.story({
  name: 'Squares, missing value',
  args: { variant: 'squares', ac: 18, pd: null, md: 12 },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'DefenseLine');
    await expect(canvas.getByRole('group')).toHaveAttribute(
      'aria-label',
      `${t('ac')} 18 · ${t('pd')} — · ${t('md')} 12`,
    );
    await expect(squareValuesOf(canvasElement)).toEqual(['18', '—', '12']);
    await expect(canvasElement.querySelector('[data-stat="pd"]')).toHaveAttribute('data-empty');
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { variant: 'line', ac: 16, pd: null, md: 19 },
  play: async ({ canvasElement }) => {
    await expect(rootOf(canvasElement).textContent).toBe('КД 16 · ФЗ — · МЗ 19');
  },
});

export const ExtraWrapsBetweenPairs = meta.story({
  name: 'Wraps between pairs only',
  args: { variant: 'line', ac: 105, pd: 99, md: 120 },
  render: (args) => (
    <div style={{ width: 80, padding: 16, background: base.surface }}>
      <DefenseLine {...args} />
    </div>
  ),
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'DefenseLine');
    await expect(linesOf(rootOf(canvasElement))).toEqual([
      `${t('ac')} 105 ·`,
      `${t('pd')} 99 ·`,
      `${t('md')} 120`,
    ]);
  },
});
