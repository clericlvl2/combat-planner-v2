import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { CardActions } from './CardActions.tsx';
import type { CardActionsProps } from './CardActions.tsx';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { base } from '../../theme.ts';

const rgb = (hex: string) => {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
};

interface CardActionsCellProps extends CardActionsProps {
  width?: number;
}

function CardActionsCell({ width = 342, ...props }: CardActionsCellProps) {
  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: width + 24,
        maxWidth: '100%',
        padding: 12,
        borderRadius: 16,
        background: 'var(--cp-color-surface)',
      }}
    >
      <CardActions {...props} />
    </div>
  );
}

const meta = preview.meta({
  title: 'Molecules/CardActions',
  component: CardActionsCell,
  args: { onEdit: fn(), onMore: fn() },
});

const columns = ['Default', 'Tap edit', 'Tap more', 'Disabled'] as const;

type CardActionsState = (typeof columns)[number];

const gridRows = [
  { label: 'Closed', open: false },
  { label: 'Open', open: true },
].map(({ label, open }) => ({
  label,
  render: (state: CardActionsState) => (
    <CardActionsCell
      width={318}
      open={open}
      disabled={state === 'Disabled'}
      data-tap={state === 'Tap edit' ? 'edit' : state === 'Tap more' ? 'more' : undefined}
      onEdit={() => {}}
      onMore={() => {}}
    />
  ),
}));

const labelOverflow = (button: HTMLElement) => {
  const label = button.querySelector('span');
  return (label?.scrollWidth ?? 0) - (label?.clientWidth ?? 0);
};

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => <StateGrid rows={gridRows} columns={columns} />,
});

export const LongLabelNarrow = meta.story({
  tags: ['visual'],
  args: { editLabel: 'Редактировать бой', width: 272 },
  play: async ({ canvas }) => {
    await expect(
      labelOverflow(canvas.getByRole('button', { name: 'Редактировать бой' })),
    ).toBeLessThanOrEqual(0);
  },
});

export const DefaultLayout = meta.story({
  tags: ['!dev'],
  args: {},
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CardActions');
    await expect(canvas.getByRole('button', { name: t('edit') })).toBeVisible();
    const more = canvas.getByRole('button', { name: t('more') });
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(more.getBoundingClientRect().width).toBe(48);
  },
});

export const OpenMarksTheButton = meta.story({
  tags: ['!dev'],
  args: { open: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CardActions');
    const more = canvas.getByRole('button', { name: t('more') });
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(more).toHaveAttribute('aria-haspopup', 'menu');
    await expect(getComputedStyle(more).backgroundColor).toBe(rgb(base.accent));
  },
});

export const EditFiresOnEdit = meta.story({
  tags: ['!dev'],
  args: { onEdit: fn(), onMore: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CardActions');
    await userEvent.click(canvas.getByRole('button', { name: t('edit') }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await expect(args.onMore).not.toHaveBeenCalled();
  },
});

export const MoreFiresOnMore = meta.story({
  tags: ['!dev'],
  args: { onEdit: fn(), onMore: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CardActions');
    await userEvent.click(canvas.getByRole('button', { name: t('more') }));
    await expect(args.onMore).toHaveBeenCalledOnce();
    await expect(args.onEdit).not.toHaveBeenCalled();
  },
});

export const DisabledIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { disabled: true, onEdit: fn(), onMore: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CardActions');
    const edit = canvas.getByRole('button', { name: t('edit') });
    const more = canvas.getByRole('button', { name: t('more') });
    await expect(edit).toBeDisabled();
    await expect(more).toBeDisabled();
    await userEvent.click(edit, { pointerEventsCheck: 0 });
    await userEvent.click(more, { pointerEventsCheck: 0 });
    await expect(args.onEdit).not.toHaveBeenCalled();
    await expect(args.onMore).not.toHaveBeenCalled();
  },
});
