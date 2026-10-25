import preview from '#.storybook/preview';
import { IconSortDescending } from '@tabler/icons-react';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import { CombatHeader } from './CombatHeader.tsx';
import type { CombatHeaderPanel, CombatHeaderProps } from './CombatHeader.tsx';
import { PageHeader } from '../PageHeader/PageHeader.tsx';
import { escapeRegExp, storyT } from '../../storybook/storyT.ts';

interface CombatHeaderCellProps extends Partial<
  Omit<CombatHeaderProps, 'round' | 'escalation' | 'open'>
> {
  round?: number | null;
  escalation?: EscalationValue;
  open?: CombatHeaderPanel | null;
  editable?: boolean;
}

function CombatHeaderCell({
  title = 'Ambush at the Ferry',
  round = 3,
  escalation = 2,
  open: initialOpen = null,
  editable = true,
  onBack,
  onRound,
  onMenu,
  onClose,
  onMenuSelect,
  onHeroes,
  onLeave,
  ...props
}: CombatHeaderCellProps) {
  const [open, setOpen] = useState<CombatHeaderPanel | null>(initialOpen);
  const toggle = (panel: CombatHeaderPanel) =>
    setOpen((current) => (current === panel ? null : panel));
  return (
    <CombatHeader
      {...props}
      title={title}
      round={round}
      escalation={escalation}
      open={open}
      onBack={props.viewer === 'player' ? undefined : () => onBack?.()}
      onRound={
        editable
          ? () => {
              toggle('round');
              onRound?.();
            }
          : undefined
      }
      onMenu={() => {
        toggle('menu');
        onMenu?.();
      }}
      onClose={() => {
        setOpen(null);
        onClose?.();
      }}
      onMenuSelect={(action) => onMenuSelect?.(action)}
      onHeroes={() => onHeroes?.()}
      onLeave={() => onLeave?.()}
    />
  );
}

const meta = preview.meta({
  title: 'Organisms/CombatHeader',
  component: CombatHeaderCell,
  parameters: { phoneFrame: { overlay: true } },
  args: {
    onBack: fn(),
    onRound: fn(),
    onMenu: fn(),
    onClose: fn(),
    onMenuSelect: fn(),
    onHeroes: fn(),
    onLeave: fn(),
  },
});

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(canvas.getByRole('button', { name: t('back') })).toBeVisible();
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Ambush at the Ferry' }),
    ).toBeVisible();
    const ticket = canvas.getByRole('button', {
      name: t('editRoundAndEscalation', { round: 3, value: 2 }),
    });
    await expect(ticket).toHaveAttribute('aria-expanded', 'false');
    await expect(ticket).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(ticket).toHaveTextContent(`${t('round')} 3`);
    await expect(ticket).toHaveTextContent(`${t('escalationCaption')} +2`);
    const menu = canvas.getByRole('button', { name: t('menu') });
    await expect(menu).toHaveAttribute('aria-haspopup', 'menu');
    await expect(ticket.getBoundingClientRect().height).toBe(48);
    await expect(menu.getBoundingClientRect().height).toBe(48);
  },
});

export const MenuOpen = meta.story({
  tags: ['visual'],
  args: { open: 'menu' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const menu = canvas.getByRole('button', { name: t('menu') });
    await expect(menu).toHaveAttribute('data-open');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(await canvas.findByRole('menu', { name: t('menuLabel') })).toBeVisible();
    const items = canvas.getAllByRole('menuitem').map((item) => item.textContent);
    await expect(items).toEqual([
      t('addUnit'),
      t('undo'),
      t('share'),
      t('export'),
      t('restart'),
      t('clear'),
    ]);
  },
});

export const TicketOpen = meta.story({
  tags: ['visual'],
  args: { open: 'round' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const ticket = canvas.getByRole('button', {
      name: t('editRoundAndEscalation', { round: 3, value: 2 }),
    });
    await expect(ticket).toHaveAttribute('data-open');
    await expect(ticket).toHaveAttribute('aria-expanded', 'true');
  },
});

export const Setup = meta.story({
  tags: ['visual'],
  args: { round: null, escalation: 0 },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Ambush at the Ferry' }),
    ).toBeVisible();
    const label = canvas.getByText(t('setup'));
    await expect(label).toBeVisible();
    await expect(label.parentElement!.getBoundingClientRect().height).toBe(48);
    await expect(
      canvas.queryByText(new RegExp(escapeRegExp(t('EscalationDie:value', { value: '' }).trim()))),
    ).toBeNull();
    await expect(canvas.getAllByRole('button').map((button) => button.ariaLabel)).toEqual([
      t('back'),
      t('menu'),
    ]);
    await userEvent.click(label);
    await expect(args.onRound).not.toHaveBeenCalled();
  },
});

export const SetupMenuOpen = meta.story({
  args: { round: null, escalation: 0, open: 'menu' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(canvas.getByRole('button', { name: t('menu') })).toHaveAttribute('data-open');
    await canvas.findByRole('menu', { name: t('menuLabel') });
    const items = canvas.getAllByRole('menuitem').map((item) => item.textContent);
    await expect(items).toEqual([t('addUnit'), t('undo'), t('share'), t('export'), t('clear')]);
  },
});

export const LongTitle = meta.story({
  tags: ['visual'],
  args: { title: 'Капитан стражи переправы: засада у моста', round: 99, escalation: 6 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const title = canvas.getByText('Капитан стражи переправы: засада у моста');
    await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
    await expect(
      canvas.getByRole('button', { name: t('editRoundAndEscalation', { round: 99, value: 6 }) }),
    ).toBeVisible();
    await expect(canvas.getByText('+6')).toBeVisible();
  },
});

export const Player = meta.story({
  tags: ['visual'],
  args: { viewer: 'player' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(
      canvas.getByRole('heading', { level: 1, name: 'Ambush at the Ferry' }),
    ).toBeVisible();
    await expect(canvas.queryByRole('button', { name: t('back') })).toBeNull();
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
    await expect(canvas.getByText(t('round')).parentElement).toHaveTextContent(`${t('round')} 3`);
    await userEvent.click(canvas.getByText('+2'));
    await expect(args.onRound).not.toHaveBeenCalled();
  },
});

export const PlayerMenuOffersHeroes = meta.story({
  tags: ['!dev'],
  args: { viewer: 'player' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await userEvent.click(canvas.getByRole('button', { name: t('menu') }));
    await expect(await canvas.findByRole('menu', { name: t('playerMenuLabel') })).toBeVisible();
    const items = canvas.getAllByRole('menuitem').map((item) => item.textContent);
    await expect(items).toEqual([t('heroes'), t('leave')]);
    await userEvent.click(canvas.getByRole('menuitem', { name: t('heroes') }));
    await expect(args.onHeroes).toHaveBeenCalledOnce();
    await expect(args.onLeave).not.toHaveBeenCalled();
    await expect(args.onMenuSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
  },
});

export const PlayerMenuOffersLeave = meta.story({
  tags: ['!dev'],
  args: { viewer: 'player' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await userEvent.click(canvas.getByRole('button', { name: t('menu') }));
    await userEvent.click(await canvas.findByRole('menuitem', { name: t('leave') }));
    await expect(args.onLeave).toHaveBeenCalledOnce();
    await expect(args.onHeroes).not.toHaveBeenCalled();
    await expect(args.onMenuSelect).not.toHaveBeenCalled();
  },
});

export const UndoDisabled = meta.story({
  args: { open: 'menu', undoDisabled: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const undo = await canvas.findByRole('menuitem', { name: t('undo') });
    await expect(undo).toBeDisabled();
    await userEvent.click(undo, { pointerEventsCheck: 0 });
    await expect(args.onMenuSelect).not.toHaveBeenCalled();
    await expect(canvas.getByRole('menuitem', { name: t('share') })).toBeEnabled();
  },
});

export const ReadOnly = meta.story({
  args: { editable: false },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(canvas.getAllByRole('button')).toHaveLength(2);
    await userEvent.click(canvas.getByText(t('round')));
    await userEvent.click(canvas.getByText('+2'));
    await expect(args.onRound).not.toHaveBeenCalled();
  },
});

export const TicketNameCarriesValues = meta.story({
  tags: ['!dev'],
  args: { round: 7, escalation: 4 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(
      canvas.getByRole('button', { name: t('editRoundAndEscalation', { round: 7, value: 4 }) }),
    ).toBeVisible();
  },
});

export const EachControlFiresItsOwnCallback = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await userEvent.click(canvas.getByRole('button', { name: t('back') }));
    await expect(args.onBack).toHaveBeenCalledOnce();
    await expect(args.onRound).not.toHaveBeenCalled();
    await expect(args.onMenu).not.toHaveBeenCalled();
    const ticket = canvas.getByRole('button', {
      name: t('editRoundAndEscalation', { round: 3, value: 2 }),
    });
    await userEvent.click(ticket);
    await expect(args.onRound).toHaveBeenCalledOnce();
    await expect(args.onMenu).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: t('menu') }));
    await expect(args.onMenu).toHaveBeenCalledOnce();
    await expect(args.onRound).toHaveBeenCalledOnce();
    await expect(args.onBack).toHaveBeenCalledOnce();
    await expect(canvas.getByRole('button', { name: t('menu') })).toHaveAttribute('data-open');
    await expect(ticket).not.toHaveAttribute('data-open');
  },
});

export const TapTicketOpensRound = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    const ticket = canvas.getByRole('button', {
      name: t('editRoundAndEscalation', { round: 3, value: 2 }),
    });
    await userEvent.click(ticket);
    await expect(args.onRound).toHaveBeenCalledOnce();
    await expect(ticket).toHaveAttribute('data-open');
    await expect(ticket).toHaveAttribute('aria-expanded', 'true');
  },
});

export const MenuItemFires = meta.story({
  tags: ['!dev'],
  args: { open: 'menu' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await userEvent.click(await canvas.findByRole('menuitem', { name: t('share') }));
    await expect(args.onMenuSelect).toHaveBeenCalledOnce();
    await expect(args.onMenuSelect).toHaveBeenCalledWith('share');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.queryByRole('menu')).toBeNull());
    await expect(canvas.getByRole('button', { name: t('menu') })).toHaveFocus();
  },
});

export const MenuKeyboardMotionOn = meta.story({
  tags: ['!dev'],
  parameters: { motion: 'on' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CombatHeader');
    await expect(document.documentElement.dataset.motion).toBe('on');
    const menu = canvas.getByRole('button', { name: t('menu') });
    menu.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onMenu).toHaveBeenCalledOnce();
    await waitFor(() => expect(canvas.getByRole('menuitem', { name: t('addUnit') })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onMenuSelect).not.toHaveBeenCalled();
    await waitFor(() => expect(menu).toHaveFocus());
  },
});

export const SameHeightAsPageHeader = meta.story({
  tags: ['!dev'],
  render: (args, { globals }) => {
    const t = storyT(globals, 'PageHeader');
    return (
      <>
        <CombatHeaderCell {...args} data-testid="combat-header" />
        <PageHeader
          data-testid="page-header"
          title={t('combats')}
          onMenu={() => {}}
          search={{ value: '', placeholder: t('searchCombats') }}
          tools={[{ id: 'sort', icon: IconSortDescending, 'aria-label': t('sort') }]}
        />
      </>
    );
  },
  play: async ({ canvas }) => {
    const combat = canvas.getByTestId('combat-header');
    const page = canvas.getByTestId('page-header');
    const rowOf = (header: HTMLElement) => header.children[1]!.getBoundingClientRect().height;
    const secondOf = (header: HTMLElement) => header.children[2]!.getBoundingClientRect();
    const topOf = (header: HTMLElement) => header.getBoundingClientRect().top;
    await expect(rowOf(combat)).toBe(rowOf(page));
    await expect(secondOf(combat).height).toBe(secondOf(page).height);
    await expect(secondOf(combat).top - topOf(combat)).toBe(secondOf(page).top - topOf(page));
    await expect(combat.getBoundingClientRect().height).toBe(page.getBoundingClientRect().height);
  },
});

export const StatusBarOffStartsWithBar = meta.story({
  tags: ['!dev'],
  args: { statusBar: false },
  play: async ({ canvas }) => {
    const heading = canvas.getByRole('heading', { level: 1, name: 'Ambush at the Ferry' });
    const header = heading.closest('header')!;
    const bar = header.children[0]!;
    await expect(bar).toContainElement(heading);
    await expect(bar.getBoundingClientRect().top).toBe(header.getBoundingClientRect().top);
  },
});
