import preview from '#.storybook/preview';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { PlayerHeader } from './PlayerHeader.tsx';
import type { PlayerHeaderProps } from './PlayerHeader.tsx';
import { anyValue, storyT } from '../../storybook/storyT.ts';

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

export const CombatInProgress = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerHeader');
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('round', { round: 3 }) }),
    ).toBeVisible();
    await expect(canvas.getByText('Ambush at the Ferry')).toBeVisible();
    await expect(canvas.getByText(t('EscalationDie:value', { value: 2 }))).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('menu') })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
});

export const Setup = meta.story({
  tags: ['visual'],
  args: { round: null, escalation: 0 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerHeader');
    await expect(canvas.getByRole('heading', { level: 1, name: t('setup') })).toBeVisible();
    await expect(canvas.queryByText(anyValue(t, 'EscalationDie:value', 'value'))).toBeNull();
    await expect(canvas.queryByText(t('EscalationDie:none'))).toBeNull();
  },
});

export const MenuOpen = meta.story({
  args: { menuOpened: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerHeader');
    const menu = canvas.getByRole('button', { name: t('menu') });
    await expect(menu).toHaveAttribute('data-open');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toHaveAttribute('aria-haspopup', 'menu');
    await expect(await canvas.findByRole('menu', { name: t('menuLabel') })).toBeVisible();
  },
});

export const WithoutMenu = meta.story({
  tags: ['visual'],
  args: { round: null, escalation: 0, withMenu: false },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerHeader');
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(canvas.getByRole('heading', { level: 1, name: t('setup') })).toBeVisible();
  },
});

export const LongTitle = meta.story({
  parameters: {
    geometry: {
      truncation: {
        reason: 'the long combat title ends with an ellipsis by design',
        except: 'span:has(+ h1)',
      },
    },
  },
  args: { title: 'Капитан стражи переправы: засада у моста', round: 12, escalation: 6 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerHeader');
    const title = canvas.getByText('Капитан стражи переправы: засада у моста');
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('round', { round: 12 }) }),
    ).toBeVisible();
    await expect(canvas.getByText(t('EscalationDie:value', { value: 6 }))).toBeVisible();
  },
});

export const RoundOneDieAtZero = meta.story({
  args: { round: 1, escalation: 0 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PlayerHeader');
    await expect(
      canvas.getByRole('heading', { level: 1, name: t('round', { round: 1 }) }),
    ).toBeVisible();
    await expect(canvas.getByText(t('EscalationDie:none'))).toBeVisible();
    await expect(canvas.queryByText(anyValue(t, 'EscalationDie:value', 'value'))).toBeNull();
  },
});

export const MenuButtonOpensMenu = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PlayerHeader');
    const menu = canvas.getByRole('button', { name: t('menu') });
    await userEvent.click(menu);
    await expect(args.onMenu).toHaveBeenCalledOnce();
    await expect(menu).toHaveAttribute('data-open');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    const heroes = await canvas.findByRole('menuitem', { name: t('heroes') });
    await waitFor(() => expect(heroes).toHaveFocus());
    await expect(heroes.querySelector('.tabler-icon-switch-horizontal')).not.toBeNull();
    await userEvent.click(heroes);
    await expect(args.onHeroes).toHaveBeenCalledOnce();
    await expect(args.onMenuClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(menu).not.toHaveAttribute('data-open');
  },
});

export const RoundAndDieNotInteractive = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PlayerHeader');
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(
      canvas.getByRole('heading', { level: 1, name: t('round', { round: 3 }) }),
    );
    await userEvent.click(canvas.getByText(t('EscalationDie:value', { value: 2 })));
    await expect(args.onMenu).not.toHaveBeenCalled();
    await expect(args.onHeroes).not.toHaveBeenCalled();
  },
});
