import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { base, hpActions } from '../../theme.ts';
import { DefenseLine } from './DefenseLine.tsx';
import type { DefenseLineProps } from './DefenseLine.tsx';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';

const NAME_COLUMN = 146;

function DefenseLineCell(props: DefenseLineProps) {
  return (
    <div
      style={{
        display: 'flex',
        boxSizing: 'content-box',
        width: NAME_COLUMN,
        padding: 12,
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
  args: { ac: 16, pd: 14, md: 19 },
});

const rgb = (hex: string) => {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
};

const chipsOf = (canvasElement: HTMLElement) => [
  ...canvasElement.querySelectorAll<HTMLElement>('[data-stat]'),
];

const valuesOf = (canvasElement: HTMLElement) =>
  chipsOf(canvasElement).map((chip) => chip.lastElementChild?.textContent);

const columns = ['Default', 'Two digits', 'Missing value'] as const;

type DefenseLineState = (typeof columns)[number];

const states: Record<DefenseLineState, Pick<DefenseLineProps, 'ac' | 'pd' | 'md'>> = {
  Default: { ac: 16, pd: 14, md: 9 },
  'Two digits': { ac: 99, pd: 99, md: 99 },
  'Missing value': { ac: 16, pd: null, md: 19 },
};

const modifiers = {
  Up: { acMod: 2, pdMod: 1, mdMod: 3 },
  Down: { acMod: -2, pdMod: -1, mdMod: -3 },
  Mixed: { acMod: 2, pdMod: -1, mdMod: 0 },
} as const satisfies Record<string, Pick<DefenseLineProps, 'acMod' | 'pdMod' | 'mdMod'>>;

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => (
    <StateGrid
      columns={columns}
      rows={[
        { label: 'Chips', render: (state) => <DefenseLineCell {...states[state]} /> },
        ...(Object.keys(modifiers) as (keyof typeof modifiers)[]).map((label) => ({
          label,
          render: (state: DefenseLineState) => (
            <DefenseLineCell {...states[state]} {...modifiers[label]} />
          ),
        })),
      ]}
    />
  ),
});

export const LabelAndChips = meta.story({
  tags: ['!dev'],
  args: { ac: 18, pd: 16, md: 12 },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'DefenseLine');
    await expect(
      canvas.getByRole('group', {
        name: `${t('ac')}\u00A018\u00A0· ${t('pd')}\u00A016\u00A0· ${t('md')}\u00A012`,
      }),
    ).toBeVisible();
    await expect(valuesOf(canvasElement)).toEqual(['18', '16', '12']);
    const [chip] = chipsOf(canvasElement);
    if (!chip) throw new Error('chip not rendered');
    const style = getComputedStyle(chip);
    await expect(chip.getBoundingClientRect().height).toBe(22);
    await expect(style.borderTopWidth).toBe('1px');
    await expect(style.borderTopColor).toBe('rgba(0, 0, 0, 0)');
    await expect(style.backgroundColor).toBe(rgb(base.background));
    const label = chip.firstElementChild;
    await expect(label && getComputedStyle(label).color).toBe(rgb(base.secondary));
    const value = chip.lastElementChild;
    await expect(value && getComputedStyle(value).color).toBe(rgb(base.ink));
  },
});

export const MissingIsMarked = meta.story({
  tags: ['!dev'],
  args: { ac: 18, pd: null, md: 12 },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'DefenseLine');
    await expect(canvas.getByRole('group')).toHaveAttribute(
      'aria-label',
      `${t('ac')}\u00A018\u00A0· ${t('pd')}\u00A0—\u00A0· ${t('md')}\u00A012`,
    );
    await expect(valuesOf(canvasElement)).toEqual(['18', '—', '12']);
    await expect(canvasElement.querySelector('[data-stat="pd"]')).toHaveAttribute('data-empty');
  },
});

export const StaysOnOneLine = meta.story({
  tags: ['!dev'],
  args: { ac: 99, pd: 99, md: 99 },
  play: async ({ canvasElement }) => {
    await document.fonts.ready;
    const boxes = chipsOf(canvasElement).map((chip) => chip.getBoundingClientRect());
    await expect(new Set(boxes.map((box) => box.top)).size).toBe(1);
    const first = boxes.at(0);
    const last = boxes.at(-1);
    await expect(first && last && last.right - first.left).toBeLessThanOrEqual(NAME_COLUMN);
  },
});

export const ModifiersShowTotals = meta.story({
  tags: ['!dev'],
  args: { ac: 18, pd: 16, md: 12, acMod: 2, pdMod: -1, mdMod: 0 },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'DefenseLine');
    await expect(canvas.getByRole('group')).toHaveAttribute(
      'aria-label',
      `${t('ac')}\u00A020\u00A0· ${t('pd')}\u00A015\u00A0· ${t('md')}\u00A012`,
    );
    await expect(valuesOf(canvasElement)).toEqual(['20', '15', '12']);
    const colourOf = (stat: string) => {
      const value = canvasElement.querySelector(`[data-stat="${stat}"]`)?.lastElementChild;
      return value ? getComputedStyle(value).color : null;
    };
    await expect(colourOf('ac')).toBe(rgb(hpActions.heal));
    await expect(colourOf('pd')).toBe(rgb(hpActions.damage));
    await expect(colourOf('md')).toBe(rgb(base.ink));
  },
});

export const TotalStaysInRange = meta.story({
  tags: ['!dev'],
  args: { ac: 98, pd: 1, md: 12, acMod: 5, pdMod: -3 },
  play: async ({ canvasElement }) => {
    await expect(valuesOf(canvasElement)).toEqual(['99', '0', '12']);
  },
});

export const EditOpens = meta.story({
  tags: ['!dev'],
  args: { ac: 18, pd: 16, md: 12, acMod: 1, onEdit: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'DefenseLine');
    const button = canvas.getByRole('button', { name: t('edit') });
    await expect(button).toHaveAccessibleDescription(
      `${t('ac')}\u00A019\u00A0· ${t('pd')}\u00A016\u00A0· ${t('md')}\u00A012`,
    );
    const tap = getComputedStyle(button, '::after');
    await expect(button.getBoundingClientRect().height - 2 * Number.parseFloat(tap.top)).toBe(44);
    await userEvent.click(button);
    await expect(args.onEdit).toHaveBeenCalledOnce();
  },
});
