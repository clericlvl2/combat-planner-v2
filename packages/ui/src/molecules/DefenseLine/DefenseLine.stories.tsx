import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { base } from '../../theme.ts';
import { DefenseLine } from './DefenseLine.tsx';
import type { DefenseLineProps } from './DefenseLine.tsx';
import { StateGrid } from '../../storybook/StateGrid.tsx';
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

function DefenseLineList({ lines }: { lines: readonly DefenseLineProps[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lines.map((line, index) => (
        <div key={index} data-case={index}>
          <DefenseLineCell {...line} />
        </div>
      ))}
    </div>
  );
}

const caseAt = (canvasElement: HTMLElement, index: number) => {
  const element = canvasElement.querySelector<HTMLElement>(`[data-case="${index}"]`);
  if (!element) throw new Error(`case ${index} not rendered`);
  return element;
};

const columns = ['Default', 'Two digits', 'Missing value'] as const;

type DefenseLineState = (typeof columns)[number];

const statesOf: Record<
  NonNullable<DefenseLineProps['variant']>,
  Record<DefenseLineState, Pick<DefenseLineProps, 'ac' | 'pd' | 'md'>>
> = {
  line: {
    Default: { ac: 16, pd: 14, md: 19 },
    'Two digits': { ac: 24, pd: 22, md: 20 },
    'Missing value': { ac: 16, pd: null, md: 19 },
  },
  squares: {
    Default: { ac: 18, pd: 16, md: 12 },
    'Two digits': { ac: 30, pd: 28, md: 26 },
    'Missing value': { ac: 18, pd: null, md: 12 },
  },
};

const gridRows = (
  [
    { label: 'Line', variant: 'line' },
    { label: 'Squares', variant: 'squares' },
  ] as const
).map(({ label, variant }) => ({
  label,
  render: (state: DefenseLineState) => (
    <DefenseLineCell variant={variant} {...statesOf[variant][state]} />
  ),
}));

const textCases: readonly DefenseLineProps[] = [
  { variant: 'line', ...statesOf.line.Default },
  { variant: 'line', ...statesOf.line['Two digits'] },
  { variant: 'line', ...statesOf.line['Missing value'] },
  { variant: 'squares', ...statesOf.squares['Two digits'] },
];

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => <StateGrid rows={gridRows} columns={columns} />,
});

export const Texts = meta.story({
  tags: ['!dev'],
  render: () => <DefenseLineList lines={textCases} />,
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'DefenseLine');
    const line = caseAt(canvasElement, 0);
    await expect(rootOf(line).textContent).toBe(`${t('ac')} 16 · ${t('pd')} 14 · ${t('md')} 19`);
    await expect(valuesOf(line)).toEqual(['16', '14', '19']);
    await expect(getComputedStyle(rootOf(line)).color).toBe(rgb(base.secondary));
    const twoDigits = caseAt(canvasElement, 1);
    await expect(rootOf(twoDigits).textContent).toBe(
      `${t('ac')} 24 · ${t('pd')} 22 · ${t('md')} 20`,
    );
    await expect(valuesOf(twoDigits)).toEqual(['24', '22', '20']);
    const missing = caseAt(canvasElement, 2);
    await expect(rootOf(missing).textContent).toBe(`${t('ac')} 16 · ${t('pd')} — · ${t('md')} 19`);
    await expect(valuesOf(missing)).toEqual(['16', '—', '19']);
    const squares = caseAt(canvasElement, 3);
    await expect(rootOf(squares)).toHaveAttribute(
      'aria-label',
      `${t('ac')} 30 · ${t('pd')} 28 · ${t('md')} 26`,
    );
    await expect(squareValuesOf(squares)).toEqual(['30', '28', '26']);
  },
});

export const ThreeStats = meta.story({
  tags: ['!dev'],
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

export const MissingIsMarked = meta.story({
  tags: ['!dev'],
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

export const WrapsBetweenPairs = meta.story({
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
