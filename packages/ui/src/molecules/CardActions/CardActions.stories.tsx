import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { CardActions } from './CardActions.tsx';
import type { CardActionsProps } from './CardActions.tsx';

interface CardActionsCellProps extends CardActionsProps {
  width?: number;
}

function CardActionsCell({ width = 342, ...props }: CardActionsCellProps) {
  return (
    <div
      style={{
        width: width + 24,
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

const renderTapEdit = (args: CardActionsCellProps) => <CardActionsCell {...args} data-tap="edit" />;

const renderTapMore = (args: CardActionsCellProps) => <CardActionsCell {...args} data-tap="more" />;

const labelOverflow = (button: HTMLElement) => {
  const label = button.querySelector('span');
  return (label?.scrollWidth ?? 0) - (label?.clientWidth ?? 0);
};

export const Anatomy = meta.story({
  args: {},
});

export const Default = meta.story({
  name: 'Default',
  args: {},
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Edit' })).toBeVisible();
    const more = canvas.getByRole('button', { name: 'More actions' });
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(more.getBoundingClientRect().width).toBe(48);
  },
});

export const TapEdit = meta.story({
  name: 'Tap Edit',
  args: {},
  render: renderTapEdit,
});

export const Tap = meta.story({
  name: 'Tap ⋯',
  args: {},
  render: renderTapMore,
});

export const OpenCardDuplicateDelete = meta.story({
  name: 'Open: card (Duplicate, Delete)',
  args: { open: true },
  play: async ({ canvas }) => {
    const more = canvas.getByRole('button', { name: 'More actions' });
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(more).toHaveAttribute('aria-haspopup', 'menu');
    await expect(getComputedStyle(more).backgroundColor).toBe('rgb(255, 231, 163)');
  },
});

export const OpenUnitUnitRow = meta.story({
  name: 'Open: unit (UnitRow)',
  args: { open: true },
});

export const De390 = meta.story({
  name: 'de · 390',
  args: { editLabel: 'Bearbeiten' },
});

export const Ru390 = meta.story({
  name: 'ru · 390',
  args: { editLabel: 'Изменить' },
});

export const De320 = meta.story({
  name: 'de · 320',
  args: { editLabel: 'Bearbeiten', width: 272 },
  play: async ({ canvas }) => {
    await expect(
      labelOverflow(canvas.getByRole('button', { name: 'Bearbeiten' })),
    ).toBeLessThanOrEqual(0);
  },
});

export const Ru320 = meta.story({
  name: 'ru · 320',
  args: { editLabel: 'Изменить', width: 272 },
  play: async ({ canvas }) => {
    await expect(
      labelOverflow(canvas.getByRole('button', { name: 'Изменить' })),
    ).toBeLessThanOrEqual(0);
  },
});

export const De320UnitMenu = meta.story({
  name: 'de · 320 · unit menu',
  args: { editLabel: 'Bearbeiten', width: 272, open: true },
});

export const Ru320UnitMenu = meta.story({
  name: 'ru · 320 · unit menu',
  args: { editLabel: 'Изменить', width: 272, open: true },
});

export const ExtraEdit = meta.story({
  name: 'Edit fires onEdit',
  args: { onEdit: fn(), onMore: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit' }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await expect(args.onMore).not.toHaveBeenCalled();
  },
});

export const ExtraMore = meta.story({
  name: '⋯ fires onMore',
  args: { onEdit: fn(), onMore: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    await expect(args.onMore).toHaveBeenCalledOnce();
    await expect(args.onEdit).not.toHaveBeenCalled();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter and Space',
  args: { onEdit: fn(), onMore: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Edit' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'More actions' })).toHaveFocus();
    await userEvent.keyboard('[Space]');
    await expect(args.onMore).toHaveBeenCalledOnce();
  },
});

export const ExtraDisabled = meta.story({
  name: 'Disabled',
  args: { disabled: true, onEdit: fn(), onMore: fn() },
  play: async ({ args, canvas }) => {
    const edit = canvas.getByRole('button', { name: 'Edit' });
    const more = canvas.getByRole('button', { name: 'More actions' });
    await expect(edit).toBeDisabled();
    await expect(more).toBeDisabled();
    await userEvent.click(edit, { pointerEventsCheck: 0 });
    await userEvent.click(more, { pointerEventsCheck: 0 });
    await expect(args.onEdit).not.toHaveBeenCalled();
    await expect(args.onMore).not.toHaveBeenCalled();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: {},
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '編集' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'その他の操作' })).toBeVisible();
  },
});
