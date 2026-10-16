import preview from '#.storybook/preview';
import { IconMenu2 } from '@tabler/icons-react';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import { Drawer } from './Drawer.tsx';
import type { DrawerSection } from './Drawer.tsx';

interface DrawerCellProps {
  current?: DrawerSection;
  email?: string;
  opened?: boolean;
  withOpener?: boolean;
  onNavigate?: (section: DrawerSection) => void;
  onClose?: () => void;
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

const burgerLabel = 'Open menu';

const openerBar: CSSProperties = { padding: 'calc(var(--cp-layout-status-bar) + 12px) 12px 12px' };

function DrawerCell({
  current = 'combats',
  email = 'dm@ferry.games',
  opened: initiallyOpened = true,
  withOpener = false,
  onNavigate,
  onClose,
}: DrawerCellProps) {
  const [opened, setOpened] = useState(initiallyOpened);
  return (
    <div style={stage}>
      {withOpener ? (
        <div style={openerBar}>
          <IconButton icon={IconMenu2} aria-label={burgerLabel} onClick={() => setOpened(true)} />
        </div>
      ) : null}
      <Drawer
        opened={opened}
        current={current}
        email={email}
        onNavigate={(section) => onNavigate?.(section)}
        onClose={() => {
          setOpened(false);
          onClose?.();
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/Drawer',
  component: DrawerCell,
  parameters: { phoneFrame: { overlay: true } },
  args: { current: 'combats', onNavigate: fn(), onClose: fn() },
});

export const Anatomy = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('dialog', { name: 'Combat Planner' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Combats' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(canvas.getByRole('button', { name: 'Library' })).not.toHaveAttribute(
      'aria-current',
    );
    await expect(canvas.getByText('dm@ferry.games')).toBeVisible();
  },
});

export const CombatsActive = meta.story({
  name: 'Combats active',
  args: { current: 'combats' },
});

export const LibraryActive = meta.story({
  name: 'Library active',
  args: { current: 'library' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Library' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(canvas.getByRole('button', { name: 'Combats' })).not.toHaveAttribute(
      'aria-current',
    );
  },
});

export const LongEmail = meta.story({
  name: 'Long email',
  args: { current: 'settings', email: 'aleksandra.konstantinovna.vishnevetskaya@example.com' },
  play: async ({ canvas }) => {
    const email = canvas.getByText('aleksandra.konstantinovna.vishnevetskaya@example.com');
    const panel = canvas.getByRole('dialog');
    await expect(email.getBoundingClientRect().right).toBeLessThanOrEqual(
      panel.getBoundingClientRect().right,
    );
  },
});

export const ExtraNavigate = meta.story({
  name: 'Tap on a section navigates and closes',
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Library' }));
    await expect(args.onNavigate).toHaveBeenCalledOnce();
    await expect(args.onNavigate).toHaveBeenCalledWith('library');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const ExtraEscape = meta.story({
  name: 'Escape closes with no navigation',
  play: async ({ args, canvas }) => {
    await waitFor(() => expect(canvas.getByRole('dialog')).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onNavigate).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const ExtraScrimTap = meta.story({
  name: 'Scrim tap closes with no navigation',
  play: async ({ args, canvasElement, canvas }) => {
    const scrim = canvasElement.querySelector<HTMLElement>('[data-scrim]');
    await expect(scrim).not.toBeNull();
    if (scrim) await userEvent.click(scrim, { pointerEventsCheck: 0 });
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onNavigate).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const ExtraFocusTrap = meta.story({
  name: 'Focus stays inside while open',
  play: async ({ args, canvas }) => {
    await waitFor(() => expect(canvas.getByRole('dialog')).toHaveFocus());
    const combats = canvas.getByRole('button', { name: 'Combats' });
    const about = canvas.getByRole('button', { name: 'About' });
    await userEvent.tab();
    await expect(combats).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(about).toHaveFocus();
    await userEvent.tab();
    await expect(combats).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Library' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onNavigate).toHaveBeenCalledWith('library');
  },
});

export const ExtraShiftTabFirst = meta.story({
  name: 'Shift+Tab right after opening stays inside',
  args: { withOpener: true },
  play: async ({ canvas }) => {
    const dialog = canvas.getByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    await userEvent.tab({ shift: true });
    await expect(dialog.contains(document.activeElement)).toBe(true);
    await expect(canvas.getByRole('button', { name: 'About' })).toHaveFocus();
  },
});

export const ExtraTapTitleThenKeys = meta.story({
  name: 'Tap on the title or email keeps focus and Escape inside',
  args: { withOpener: true },
  play: async ({ args, canvas }) => {
    const dialog = canvas.getByRole('dialog');
    await userEvent.click(canvas.getByRole('heading', { name: 'Combat Planner' }));
    await userEvent.tab({ shift: true });
    await expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.click(canvas.getByText('dm@ferry.games'));
    await userEvent.tab({ shift: true });
    await expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
});

export const ExtraScrollLock = meta.story({
  name: 'Page scroll is locked while open',
  play: async ({ canvas }) => {
    await expect(getComputedStyle(document.body).overflow).toBe('hidden');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
    await expect(getComputedStyle(document.body).overflow).not.toBe('hidden');
  },
});

export const ExtraFocusReturn = meta.story({
  name: 'Focus returns to the burger on close',
  args: { opened: false, withOpener: true },
  play: async ({ args, canvas }) => {
    await expect(canvas.queryByRole('dialog')).toBeNull();
    const burger = canvas.getByRole('button', { name: 'Open menu' });
    await userEvent.click(burger);
    await canvas.findByRole('dialog', { name: 'Combat Planner' });
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(burger).toHaveFocus());
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Бои' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(canvas.getByRole('button', { name: 'О приложении' })).toBeVisible();
  },
});
