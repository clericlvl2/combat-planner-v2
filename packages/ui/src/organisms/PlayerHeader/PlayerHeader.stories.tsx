import preview from '#.storybook/preview';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { PlayerHeader } from './PlayerHeader.tsx';
import type { PlayerHeaderProps } from './PlayerHeader.tsx';

interface PlayerHeaderCellProps extends Omit<
  PlayerHeaderProps,
  'title' | 'round' | 'escalation' | 'onMenu'
> {
  title?: string;
  round?: number | null;
  escalation?: PlayerHeaderProps['escalation'];
  withMenu?: boolean;
  onMenu?: () => void;
}

function PlayerHeaderCell({
  title = 'Ambush at the Ferry',
  round = 3,
  escalation = 2,
  withMenu = true,
  menuOpened: initiallyOpened = false,
  onMenu,
  onMenuClose,
  ...props
}: PlayerHeaderCellProps) {
  const [opened, setOpened] = useState(initiallyOpened);
  return (
    <PlayerHeader
      {...props}
      title={title}
      round={round}
      escalation={escalation}
      menuOpened={opened}
      onMenu={
        withMenu
          ? () => {
              setOpened((value) => !value);
              onMenu?.();
            }
          : undefined
      }
      onMenuClose={() => {
        setOpened(false);
        onMenuClose?.();
      }}
    />
  );
}

const meta = preview.meta({
  title: 'Organisms/PlayerHeader',
  component: PlayerHeaderCell,
  parameters: { phoneFrame: { overlay: true } },
  args: { onMenu: fn(), onMenuClose: fn(), onHeroes: fn() },
});

export const Anatomy = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Round 3' })).toBeVisible();
    await expect(canvas.getByText('Ambush at the Ferry')).toBeVisible();
    await expect(canvas.getByText('Escalation 2')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
});

export const Combat = meta.story({
  name: 'Combat',
});

export const Setup = meta.story({
  name: 'Setup',
  args: { round: null, escalation: 0 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Setup' })).toBeVisible();
    await expect(canvas.queryByText(/Escalation/)).toBeNull();
    await expect(canvas.queryByText('No escalation')).toBeNull();
  },
});

export const MenuTapped = meta.story({
  name: 'Menu tapped',
  args: { menuOpened: true },
  play: async ({ canvas }) => {
    const menu = canvas.getByRole('button', { name: 'Menu' });
    await expect(menu).toHaveAttribute('data-open');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toHaveAttribute('aria-haspopup', 'menu');
    await expect(await canvas.findByRole('menu', { name: 'Player menu' })).toBeVisible();
  },
});

export const HeroPicker = meta.story({
  name: 'Hero picker',
  args: { round: null, escalation: 0, withMenu: false },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(canvas.getByRole('heading', { level: 1, name: 'Setup' })).toBeVisible();
  },
});

export const LongTitleRound12 = meta.story({
  name: 'Long title, round 12',
  parameters: { geometry: { truncation: 'the long combat title ends with an ellipsis by design' } },
  args: { title: 'Капитан стражи переправы: засада у моста', round: 12, escalation: 6 },
  play: async ({ canvas }) => {
    const title = canvas.getByText('Капитан стражи переправы: засада у моста');
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    await expect(canvas.getByRole('heading', { level: 1, name: 'Round 12' })).toBeVisible();
    await expect(canvas.getByText('Escalation 6')).toBeVisible();
  },
});

export const ExtraMenuOpens = meta.story({
  name: 'Menu button opens the player menu',
  play: async ({ args, canvas }) => {
    const menu = canvas.getByRole('button', { name: 'Menu' });
    await userEvent.click(menu);
    await expect(args.onMenu).toHaveBeenCalledOnce();
    await expect(menu).toHaveAttribute('data-open');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    const heroes = await canvas.findByRole('menuitem', { name: 'Heroes' });
    await waitFor(() => expect(heroes).toHaveFocus());
    await expect(heroes.querySelector('.tabler-icon-switch-horizontal')).not.toBeNull();
    await userEvent.click(heroes);
    await expect(args.onHeroes).toHaveBeenCalledOnce();
    await expect(args.onMenuClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(menu).not.toHaveAttribute('data-open');
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter opens, Escape closes',
  play: async ({ args, canvas }) => {
    const menu = canvas.getByRole('button', { name: 'Menu' });
    await userEvent.tab();
    await expect(menu).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onMenu).toHaveBeenCalledOnce();
    const heroes = await canvas.findByRole('menuitem', { name: 'Heroes' });
    await waitFor(() => expect(heroes).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await expect(args.onMenuClose).toHaveBeenCalledOnce();
    await expect(args.onHeroes).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(menu).toHaveFocus());
  },
});

export const ExtraLocaleFr = meta.story({
  name: 'Locale fr: the menu caption reads Menu',
  globals: { locale: 'fr' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Menu' })).toBeVisible();
    await expect(canvas.queryByText('Plus')).toBeNull();
  },
});

export const ExtraDisplayOnly = meta.story({
  name: 'Round and die are not interactive',
  play: async ({ args, canvas }) => {
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(canvas.getByRole('heading', { level: 1, name: 'Round 3' }));
    await userEvent.click(canvas.getByText('Escalation 2'));
    await expect(args.onMenu).not.toHaveBeenCalled();
    await expect(args.onHeroes).not.toHaveBeenCalled();
  },
});
