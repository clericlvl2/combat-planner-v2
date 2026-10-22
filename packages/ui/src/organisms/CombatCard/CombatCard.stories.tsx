import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { layout } from '../../layout.ts';
import { CombatCard } from './CombatCard.tsx';
import type { CombatCardProps } from './CombatCard.tsx';
import { storyT } from '../../storybook/storyT.ts';

type CombatCardCellProps = Partial<CombatCardProps>;

const list: CSSProperties = {
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: layout.listGap,
  minHeight: 0,
  padding: layout.contentEdge,
  overflowY: 'auto',
};

const ambush = {
  title: 'Ambush at the Ferry',
  description: 'Session 12. Goblins hold the crossing, the orc waits on the raft.',
  color: 0,
  status: 'active',
  round: 3,
  units: 6,
} as const;

function CombatCardCell({
  title = ambush.title,
  description,
  color = ambush.color,
  status = ambush.status,
  round = ambush.round,
  units = ambush.units,
  expanded: initiallyExpanded = false,
  menuOpen: initiallyOpen = false,
  onToggle,
  onMore,
  onMenuClose,
  onOpen,
  onEdit,
  onMenuSelect,
  ...props
}: CombatCardCellProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [menuOpen, setMenuOpen] = useState(initiallyOpen);
  return (
    <CombatCard
      {...props}
      title={title}
      description={description}
      color={color}
      status={status}
      round={round}
      units={units}
      expanded={expanded}
      menuOpen={menuOpen}
      onOpen={() => onOpen?.()}
      onEdit={() => onEdit?.()}
      onToggle={() => {
        setExpanded((value) => !value);
        setMenuOpen(false);
        onToggle?.();
      }}
      onMore={() => {
        setMenuOpen((value) => !value);
        onMore?.();
      }}
      onMenuClose={() => {
        setMenuOpen(false);
        onMenuClose?.();
      }}
      onMenuSelect={(action) => onMenuSelect?.(action)}
    />
  );
}

const openButton = (canvas: ReturnType<typeof within>, t: TFunction, title: string) =>
  canvas.getByRole('button', {
    name: (label: string) => label.startsWith(title) && label !== t('details', { title }),
  });

const meta = preview.meta({
  title: 'Organisms/CombatCard',
  component: CombatCardCell,
  parameters: { phoneFrame: true },
  decorators: [
    (Story) => (
      <div style={list}>
        <Story />
      </div>
    ),
  ],
  args: {
    description: ambush.description,
    onOpen: fn(),
    onToggle: fn(),
    onEdit: fn(),
    onMore: fn(),
    onMenuClose: fn(),
    onMenuSelect: fn(),
  },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatCard');
    const open = openButton(canvas, t, 'Ambush at the Ferry');
    await expect(open).toHaveTextContent(
      `Ambush at the Ferry${t('active')}${t('round', { round: 3 })} · ${t('units', { count: 6 })}`,
    );
    await expect(
      canvas.getByRole('button', { name: t('details', { title: 'Ambush at the Ferry' }) }),
    ).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByRole('button', { name: t('CardActions:edit') })).toBeNull();
  },
});

export const Expanded = meta.story({
  tags: ['visual'],
  args: { expanded: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatCard');
    await expect(canvas.getByText(ambush.description)).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('CardActions:edit') })).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('CardActions:more') })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(
      canvas.getByRole('button', { name: t('details', { title: 'Ambush at the Ferry' }) }),
    ).toHaveAttribute('aria-expanded', 'true');
  },
});

export const ExpandedNoDescription = meta.story({
  args: {
    title: 'The Drowned Chapel',
    description: undefined,
    status: 'setup',
    round: null,
    units: 4,
    color: 5,
    expanded: true,
  },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatCard');
    await expect(openButton(canvas, t, 'The Drowned Chapel')).toHaveTextContent(
      `The Drowned Chapel${t('setup')}${t('units', { count: 4 })}`,
    );
    await expect(canvas.queryByRole('paragraph')).toBeNull();
  },
});

export const MenuOpen = meta.story({
  args: { expanded: true, menuOpen: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatCard');
    const more = canvas.getByRole('button', { name: t('CardActions:more') });
    await expect(more).toHaveAttribute('data-open');
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(
      await canvas.findByRole('menu', { name: t('menuLabel', { title: 'Ambush at the Ferry' }) }),
    ).toBeVisible();
    const items = canvas.getAllByRole('menuitem').map((item) => item.textContent);
    await expect(items).toEqual([t('duplicate'), t('delete')]);
  },
});

export const SetupCollapsed = meta.story({
  args: {
    title: 'The Drowned Chapel',
    status: 'setup',
    round: null,
    units: 4,
    color: 5,
    expanded: false,
  },
});

export const SetupLongTitle = meta.story({
  tags: ['visual'],
  args: {
    title: 'Капитан стражи переправы: засада у моста',
    status: 'setup',
    round: null,
    units: 9,
    color: 3,
  },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatCard');
    const chevron = canvas.getByRole('button', {
      name: t('details', { title: 'Капитан стражи переправы: засада у моста' }),
    });
    await expect(chevron.getBoundingClientRect().width).toBe(40);
    await expect(canvas.getByText(`${t('units', { count: 9 })}`)).toBeVisible();
  },
});

export const LastPlayed = meta.story({
  render: (args) => (
    <>
      <CombatCardCell {...args} lastPlayedDays={0} />
      <CombatCardCell {...args} lastPlayedDays={1} />
      <CombatCardCell {...args} lastPlayedDays={5} />
      <CombatCardCell {...args} lastPlayedDays={13} />
      <CombatCardCell {...args} lastPlayedDays={14} />
      <CombatCardCell {...args} lastPlayedDays={30} />
      <CombatCardCell
        {...args}
        title="The Drowned Chapel"
        status="setup"
        round={null}
        units={1}
        color={5}
        lastPlayedDays={null}
      />
    </>
  ),
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatCard');
    await expect(
      canvas.getByText(`${t('round', { round: 3 })} · ${t('units', { count: 6 })} · ${t('today')}`),
    ).toBeVisible();
    await expect(
      canvas.getByText(
        `${t('round', { round: 3 })} · ${t('units', { count: 6 })} · ${t('yesterday')}`,
      ),
    ).toBeVisible();
    for (const count of [5, 13]) {
      await expect(
        canvas.getByText(
          `${t('round', { round: 3 })} · ${t('units', { count: 6 })} · ${t('daysAgo', { count })}`,
        ),
      ).toBeVisible();
    }
    for (const count of [2, 4]) {
      await expect(
        canvas.getByText(
          `${t('round', { round: 3 })} · ${t('units', { count: 6 })} · ${t('weeksAgo', { count })}`,
        ),
      ).toBeVisible();
    }
    await expect(
      canvas.getByText(`${t('units', { count: 1 })} · ${t('neverPlayed')}`),
    ).toBeVisible();
  },
});

export const DuplicateDisabled = meta.story({
  args: { expanded: true, menuOpen: true, duplicateDisabled: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatCard');
    const duplicate = await canvas.findByRole('menuitem', { name: t('duplicate') });
    await expect(duplicate).toBeDisabled();
    await userEvent.click(duplicate, { pointerEventsCheck: 0 });
    await expect(args.onMenuSelect).not.toHaveBeenCalled();
    await expect(canvas.getByRole('menuitem', { name: t('delete') })).toBeEnabled();
  },
});

export const TapCardOpens = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByText('Ambush at the Ferry'));
    await expect(args.onOpen).toHaveBeenCalledOnce();
    await expect(args.onToggle).not.toHaveBeenCalled();
    await expect(args.onEdit).not.toHaveBeenCalled();
    await expect(args.onMore).not.toHaveBeenCalled();
  },
});

export const ChevronNeverOpens = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatCard');
    const chevron = canvas.getByRole('button', {
      name: t('details', { title: 'Ambush at the Ferry' }),
    });
    await userEvent.click(chevron);
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(chevron).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('button', { name: t('CardActions:edit') })).toBeVisible();
    await userEvent.click(chevron);
    await expect(args.onToggle).toHaveBeenCalledTimes(2);
    await expect(chevron).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByRole('button', { name: t('CardActions:edit') })).toBeNull();
    await expect(args.onOpen).not.toHaveBeenCalled();
  },
});

export const EditAndMoreFire = meta.story({
  tags: ['!dev'],
  args: { expanded: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatCard');
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:edit') }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: t('CardActions:more') }));
    await expect(args.onMore).toHaveBeenCalledOnce();
    await userEvent.click(await canvas.findByRole('menuitem', { name: t('duplicate') }));
    await expect(args.onMenuSelect).toHaveBeenCalledOnce();
    await expect(args.onMenuSelect).toHaveBeenCalledWith('duplicate');
    await expect(args.onMenuClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(canvas.getByRole('button', { name: t('CardActions:more') })).toHaveFocus();
    await expect(args.onOpen).not.toHaveBeenCalled();
  },
});

export const CollapsedHidesActions = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatCard');
    await expect(canvas.queryByRole('button', { name: t('CardActions:edit') })).toBeNull();
    await expect(canvas.queryByRole('button', { name: t('CardActions:more') })).toBeNull();
    await userEvent.click(
      canvas.getByText(`${t('round', { round: 3 })} · ${t('units', { count: 6 })}`),
    );
    await expect(args.onOpen).toHaveBeenCalledOnce();
    await expect(args.onEdit).not.toHaveBeenCalled();
    await expect(args.onMore).not.toHaveBeenCalled();
    await expect(args.onMenuSelect).not.toHaveBeenCalled();
  },
});

export const EnterOpensSpaceToggles = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatCard');
    await userEvent.tab();
    await expect(openButton(canvas, t, 'Ambush at the Ferry')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onOpen).toHaveBeenCalledOnce();
    await userEvent.tab();
    const chevron = canvas.getByRole('button', {
      name: t('details', { title: 'Ambush at the Ferry' }),
    });
    await expect(chevron).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(chevron).toHaveAttribute('aria-expanded', 'true');
    await expect(args.onOpen).toHaveBeenCalledOnce();
  },
});
