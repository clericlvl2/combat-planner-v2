import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { EscalationDie } from './EscalationDie.tsx';
import type { EscalationDieProps, EscalationValue } from './EscalationDie.tsx';
import { base, interaction } from '../../theme.ts';

const rgb = (hex: string) => {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
};

const meta = preview.meta({
  title: 'Atoms/EscalationDie',
  component: EscalationDie,
  args: { value: 0 },
});

const tileOf = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLElement>('[data-tile]');

const pipCount = (canvasElement: HTMLElement) =>
  canvasElement.querySelectorAll('[data-pip]').length;

const values = ['0', '1', '2', '3', '4', '5', '6'] as const;
type Value = (typeof values)[number];

const valueOf = (value: Value) => Number(value) as EscalationValue;

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => (
    <StateGrid
      columns={values}
      rows={[
        {
          label: 'Read only',
          render: (value: Value) => <EscalationDie value={valueOf(value)} readOnly />,
        },
        {
          label: 'Interactive',
          render: (value: Value) => <EscalationDie value={valueOf(value)} onClick={fn()} />,
        },
        {
          label: 'Interactive focus',
          render: (value: Value) => (
            <EscalationDie value={valueOf(value)} onClick={fn()} data-focus="" />
          ),
        },
      ]}
    />
  ),
});

export const ZeroIsEmptyDashedTile = meta.story({
  tags: ['!dev'],
  args: { value: 0 },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'EscalationDie');
    const caption = canvas.getByText(t('none'));
    await expect(caption).toBeVisible();
    await expect(getComputedStyle(caption).color).toBe(rgb(base.secondary));
    await expect(pipCount(canvasElement)).toBe(0);
    const tile = tileOf(canvasElement);
    await expect(tile && getComputedStyle(tile).borderTopStyle).toBe('dashed');
    await expect(tile && getComputedStyle(tile).borderTopColor).toBe(rgb(base.muted));
    await expect(tile && getComputedStyle(tile).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  },
});

export const ClickFiresOnce = meta.story({
  tags: ['!dev'],
  args: { value: 3, onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'EscalationDie');
    await userEvent.click(canvas.getByRole('button', { name: t('value', { value: 3 }) }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const EnterAndSpaceActivate = meta.story({
  tags: ['!dev'],
  args: { value: 1, onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'EscalationDie');
    const button = canvas.getByRole('button', { name: t('value', { value: 1 }) });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('[Space]');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const FocusRing = meta.story({
  tags: ['!dev'],
  args: { value: 2, onClick: fn() },
  render: (args: EscalationDieProps) => <EscalationDie {...args} data-focus="" />,
  play: async ({ canvasElement }) => {
    const tile = tileOf(canvasElement);
    await expect(tile && getComputedStyle(tile).outlineColor).toBe(rgb(interaction.focus));
  },
});

export const ReadOnlyIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { value: 4, readOnly: true, onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'EscalationDie');
    await expect(canvas.queryByRole('button')).toBeNull();
    await userEvent.click(canvas.getByText(t('value', { value: 4 })));
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});
