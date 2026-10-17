import preview from '#.storybook/preview';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { layout } from '../../layout.ts';
import { CombatCard } from './CombatCard.tsx';
import type { CombatCardProps } from './CombatCard.tsx';

type CombatCardCellProps = Partial<CombatCardProps>;

const list: CSSProperties = {
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: layout.listGap,
  padding: layout.contentEdge,
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

export const Anatomy = meta.story({
  play: async ({ canvas }) => {
    const open = canvas.getByRole('button', { name: /^Ambush at the Ferry/ });
    await expect(open).toHaveTextContent('Ambush at the FerryActiveRound 3 · 6 units');
    await expect(
      canvas.getByRole('button', { name: 'Details for Ambush at the Ferry' }),
    ).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByRole('button', { name: 'Edit' })).toBeNull();
  },
});

export const Active = meta.story({
  name: 'Active',
});

export const Expanded = meta.story({
  name: 'Expanded',
  args: { expanded: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(ambush.description)).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'More actions' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(
      canvas.getByRole('button', { name: 'Details for Ambush at the Ferry' }),
    ).toHaveAttribute('aria-expanded', 'true');
  },
});

export const ExpandedNoDescription = meta.story({
  name: 'Expanded, no description',
  args: {
    title: 'The Drowned Chapel',
    description: undefined,
    status: 'setup',
    round: null,
    units: 4,
    color: 5,
    expanded: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /^The Drowned Chapel/ })).toHaveTextContent(
      'The Drowned ChapelSetup4 units',
    );
    await expect(canvas.queryByRole('paragraph')).toBeNull();
  },
});

export const ChevronTapped = meta.story({
  name: 'Chevron tapped',
  args: { 'data-tap': 'chevron' },
});

export const ExpandedOpen = meta.story({
  name: 'Expanded, ⋯ open',
  args: { expanded: true, menuOpen: true },
  play: async ({ canvas }) => {
    const more = canvas.getByRole('button', { name: 'More actions' });
    await expect(more).toHaveAttribute('data-open');
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(
      await canvas.findByRole('menu', { name: 'Actions for Ambush at the Ferry' }),
    ).toBeVisible();
    const items = canvas.getAllByRole('menuitem').map((item) => item.textContent);
    await expect(items).toEqual(['Duplicate', 'Delete']);
  },
});

export const SetupLongTitleRu = meta.story({
  name: 'Setup, long title, ru',
  args: {
    title: 'Капитан стражи переправы: засада у моста',
    status: 'setup',
    round: null,
    units: 9,
    color: 3,
  },
  play: async ({ canvas }) => {
    const chevron = canvas.getByRole('button', {
      name: 'Details for Капитан стражи переправы: засада у моста',
    });
    await expect(chevron.getBoundingClientRect().width).toBe(40);
    await expect(canvas.getByText('9 units')).toBeVisible();
  },
});

export const Ja99Units = meta.story({
  name: 'ja, 99 units',
  args: { title: '黒水の渡し守と呪われし大蛇の群れ', round: 14, units: 99, color: 6 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('黒水の渡し守と呪われし大蛇の群れ')).toBeVisible();
    await expect(canvas.getByText('Round 14 · 99 units')).toBeVisible();
  },
});

export const ExtraTapCardOpens = meta.story({
  name: 'Tap on the card opens the combat',
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByText('Ambush at the Ferry'));
    await expect(args.onOpen).toHaveBeenCalledOnce();
    await expect(args.onToggle).not.toHaveBeenCalled();
    await expect(args.onEdit).not.toHaveBeenCalled();
    await expect(args.onMore).not.toHaveBeenCalled();
  },
});

export const ExtraChevronNeverOpens = meta.story({
  name: 'Chevron toggles and never opens',
  play: async ({ args, canvas }) => {
    const chevron = canvas.getByRole('button', { name: 'Details for Ambush at the Ferry' });
    await userEvent.click(chevron);
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(chevron).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('button', { name: 'Edit' })).toBeVisible();
    await userEvent.click(chevron);
    await expect(args.onToggle).toHaveBeenCalledTimes(2);
    await expect(chevron).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByRole('button', { name: 'Edit' })).toBeNull();
    await expect(args.onOpen).not.toHaveBeenCalled();
  },
});

export const ExtraCardActions = meta.story({
  name: 'Edit and ⋯ fire through CardActions',
  args: { expanded: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit' }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));
    await expect(args.onMore).toHaveBeenCalledOnce();
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Duplicate' }));
    await expect(args.onMenuSelect).toHaveBeenCalledOnce();
    await expect(args.onMenuSelect).toHaveBeenCalledWith('duplicate');
    await expect(args.onMenuClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(canvas.getByRole('button', { name: 'More actions' })).toHaveFocus();
    await expect(args.onOpen).not.toHaveBeenCalled();
  },
});

export const ExtraCollapsedHidesActions = meta.story({
  name: 'Collapsed card has no Edit or ⋯ to fire',
  play: async ({ args, canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Edit' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'More actions' })).toBeNull();
    await userEvent.click(canvas.getByText('Round 3 · 6 units'));
    await expect(args.onOpen).toHaveBeenCalledOnce();
    await expect(args.onEdit).not.toHaveBeenCalled();
    await expect(args.onMore).not.toHaveBeenCalled();
    await expect(args.onMenuSelect).not.toHaveBeenCalled();
  },
});

export const ExtraFlowTapChevron = meta.story({
  name: 'Flow: tap chevron expands the card',
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Details for Ambush at the Ferry' }));
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(canvas.getByText(ambush.description)).toBeVisible();
  },
});

export const ExtraFlowTapMore = meta.story({
  name: 'Flow: tap ⋯ opens the menu',
  args: { expanded: true },
  play: async ({ args, canvas }) => {
    const more = canvas.getByRole('button', { name: 'More actions' });
    await userEvent.click(more);
    await expect(args.onMore).toHaveBeenCalledOnce();
    await expect(more).toHaveAttribute('data-open');
    await waitFor(() => expect(canvas.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus());
  },
});

export const ExtraFlowTapDelete = meta.story({
  name: 'Flow: tap Delete fires delete',
  args: { expanded: true, menuOpen: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(await canvas.findByRole('menuitem', { name: 'Delete' }));
    await expect(args.onMenuSelect).toHaveBeenCalledOnce();
    await expect(args.onMenuSelect).toHaveBeenCalledWith('delete');
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter opens, Space toggles',
  play: async ({ args, canvas }) => {
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: /^Ambush at the Ferry/ })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onOpen).toHaveBeenCalledOnce();
    await userEvent.tab();
    const chevron = canvas.getByRole('button', { name: 'Details for Ambush at the Ferry' });
    await expect(chevron).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect(args.onToggle).toHaveBeenCalledOnce();
    await expect(chevron).toHaveAttribute('aria-expanded', 'true');
    await expect(args.onOpen).toHaveBeenCalledOnce();
  },
});

export const ExtraMenuKeyboardMotionOn = meta.story({
  name: 'Motion on: Enter on ⋯ focuses Duplicate, Escape returns focus',
  args: { expanded: true },
  parameters: { motion: 'on' },
  play: async ({ args, canvas }) => {
    await expect(document.documentElement.dataset.motion).toBe('on');
    const more = canvas.getByRole('button', { name: 'More actions' });
    more.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onMore).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onMenuClose).toHaveBeenCalledOnce();
    await expect(args.onMenuSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(more).toHaveFocus());
  },
});

export const ExtraLastPlayed = meta.story({
  name: 'Last played sort: Today, Yesterday, days ago, Never played',
  render: (args) => (
    <>
      <CombatCardCell {...args} lastPlayedDays={0} />
      <CombatCardCell {...args} lastPlayedDays={1} />
      <CombatCardCell {...args} lastPlayedDays={5} />
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
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Round 3 · 6 units · Today')).toBeVisible();
    await expect(canvas.getByText('Round 3 · 6 units · Yesterday')).toBeVisible();
    await expect(canvas.getByText('Round 3 · 6 units · 5 days ago')).toBeVisible();
    await expect(canvas.getByText('1 unit · Never played')).toBeVisible();
  },
});

export const ExtraWeeksAgo = meta.story({
  name: 'Last played from 14 days shows weeks',
  render: (args) => (
    <>
      <CombatCardCell {...args} lastPlayedDays={13} />
      <CombatCardCell {...args} lastPlayedDays={14} />
      <CombatCardCell {...args} lastPlayedDays={30} />
    </>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Round 3 · 6 units · 13 days ago')).toBeVisible();
    await expect(canvas.getByText('Round 3 · 6 units · 2 weeks ago')).toBeVisible();
    await expect(canvas.getByText('Round 3 · 6 units · 4 weeks ago')).toBeVisible();
  },
});

export const ExtraDuplicateDisabled = meta.story({
  name: 'Duplicate disabled at the combat limit',
  args: { expanded: true, menuOpen: true, duplicateDisabled: true },
  play: async ({ args, canvas }) => {
    const duplicate = await canvas.findByRole('menuitem', { name: 'Duplicate' });
    await expect(duplicate).toBeDisabled();
    await userEvent.click(duplicate, { pointerEventsCheck: 0 });
    await expect(args.onMenuSelect).not.toHaveBeenCalled();
    await expect(canvas.getByRole('menuitem', { name: 'Delete' })).toBeEnabled();
  },
});
