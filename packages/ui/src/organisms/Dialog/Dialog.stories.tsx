import preview from '#.storybook/preview';
import { IconLinkOff, IconRefresh, IconTrash, IconUserMinus, IconUserX } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Button } from '../../atoms/Button/Button.tsx';
import { Sheet } from '../Sheet/Sheet.tsx';
import { Dialog } from './Dialog.tsx';
import type { DialogTone } from './Dialog.tsx';

type Preset =
  | 'restart'
  | 'clear'
  | 'remove'
  | 'revoke'
  | 'deleteCombat'
  | 'deletePreset'
  | 'deleteAccount';

interface PresetSpec {
  icon: Icon;
  title: string;
  body: string;
  ok: string;
  tone: DialogTone;
}

interface DialogCellProps {
  preset?: Preset;
  title?: string;
  body?: string;
  ok?: string;
  opened?: boolean;
  withOpener?: boolean;
  units?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  onSheetClose?: () => void;
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

function usePresets(unitCount: number): Record<Preset, PresetSpec> {
  const { t } = useTranslation('Dialog');
  return {
    restart: {
      icon: IconRefresh,
      title: t('restartTitle'),
      body: t('restartBody'),
      ok: t('restart'),
      tone: 'ink',
    },
    clear: {
      icon: IconTrash,
      title: t('clearTitle'),
      body: t('clearBody', { count: unitCount }),
      ok: t('clear'),
      tone: 'danger',
    },
    remove: {
      icon: IconUserMinus,
      title: t('removeTitle', { name: 'Orc Berserker' }),
      body: t('removeBody'),
      ok: t('remove'),
      tone: 'danger',
    },
    revoke: {
      icon: IconLinkOff,
      title: t('revokeTitle'),
      body: t('revokeBody'),
      ok: t('revoke'),
      tone: 'danger',
    },
    deleteCombat: {
      icon: IconTrash,
      title: t('deleteCombatTitle', { name: 'Ambush at the Ferry' }),
      body: t('deleteCombatBody', { count: unitCount }),
      ok: t('delete'),
      tone: 'danger',
    },
    deletePreset: {
      icon: IconTrash,
      title: t('deletePresetTitle', { name: 'Orc Berserker' }),
      body: t('deletePresetBody'),
      ok: t('delete'),
      tone: 'danger',
    },
    deleteAccount: {
      icon: IconUserX,
      title: t('deleteAccountTitle'),
      body: t('deleteAccountBody'),
      ok: t('delete'),
      tone: 'danger',
    },
  };
}

function DialogCell({
  preset = 'clear',
  title,
  body,
  ok,
  opened: initiallyOpened = true,
  withOpener = false,
  units = 6,
  onConfirm,
  onCancel,
}: DialogCellProps) {
  const { t } = useTranslation('Dialog');
  const spec = usePresets(units)[preset];
  const [opened, setOpened] = useState(initiallyOpened);
  return (
    <div style={stage}>
      {withOpener ? (
        <div style={{ padding: 'calc(var(--cp-layout-status-bar) + 12px) 12px 12px' }}>
          <Button variant="secondary" size="S" onClick={() => setOpened(true)}>
            Clear combat
          </Button>
        </div>
      ) : null}
      <Dialog
        opened={opened}
        icon={spec.icon}
        title={title ?? spec.title}
        body={body ?? spec.body}
        confirmLabel={ok ?? spec.ok}
        tone={spec.tone}
        onConfirm={() => {
          setOpened(false);
          onConfirm?.();
        }}
        onCancel={() => {
          setOpened(false);
          onCancel?.();
        }}
      />
    </div>
  );
}

function OverSheetCell({ onConfirm, onCancel, onSheetClose }: DialogCellProps) {
  const { t } = useTranslation('Dialog');
  const spec = usePresets(6).clear;
  const [sheetOpened, setSheetOpened] = useState(true);
  const [dialogOpened, setDialogOpened] = useState(false);
  return (
    <div style={stage}>
      <Sheet
        opened={sheetOpened}
        title="Clear combat"
        onClose={() => {
          setSheetOpened(false);
          onSheetClose?.();
        }}
        actions={
          <Button variant="danger" size="M" fullWidth onClick={() => setDialogOpened(true)}>
            {spec.ok}
          </Button>
        }
      >
        <p style={{ margin: 0 }}>{spec.body}</p>
      </Sheet>
      <Dialog
        opened={dialogOpened}
        icon={spec.icon}
        title={spec.title}
        body={spec.body}
        confirmLabel={spec.ok}
        tone={spec.tone}
        onConfirm={() => {
          setDialogOpened(false);
          onConfirm?.();
        }}
        onCancel={() => {
          setDialogOpened(false);
          onCancel?.();
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/Dialog',
  component: DialogCell,
  parameters: { phoneFrame: { overlay: true } },
  args: { preset: 'clear', onConfirm: fn(), onCancel: fn(), onSheetClose: fn() },
});

export const Anatomy = meta.story({});

export const Restart = meta.story({
  name: 'restart',
  args: { preset: 'restart' },
  play: async ({ canvas }) => {
    const dialog = canvas.getByRole('alertdialog', { name: 'Restart combat?' });
    await expect(dialog).toHaveAccessibleDescription(/Units and claims stay/);
    await expect(canvas.getByRole('button', { name: 'Restart' })).toBeVisible();
  },
});

export const Clear = meta.story({
  name: 'clear',
  args: { preset: 'clear' },
});

export const Remove = meta.story({
  name: 'remove',
  args: { preset: 'remove' },
});

export const Revoke = meta.story({
  name: 'revoke',
  args: { preset: 'revoke' },
});

export const DeleteCombat = meta.story({
  name: 'deleteCombat',
  args: { preset: 'deleteCombat' },
});

export const DeletePreset = meta.story({
  name: 'deletePreset',
  args: { preset: 'deletePreset' },
});

export const DeleteAccount = meta.story({
  name: 'deleteAccount',
  args: { preset: 'deleteAccount' },
});

export const LongUnitName = meta.story({
  name: 'Long unit name',
  args: { preset: 'remove', title: 'Remove Brother Tomas of the Silver Lantern Order?' },
  play: async ({ canvas }) => {
    const cancel = canvas.getByRole('button', { name: 'Cancel' });
    const remove = canvas.getByRole('button', { name: 'Remove' });
    await expect(cancel.getBoundingClientRect().width).toBe(remove.getBoundingClientRect().width);
  },
});

export const Ru = meta.story({
  name: 'ru',
  args: {
    preset: 'deleteCombat',
    title: 'Удалить «Засада у переправы»?',
    body: 'Сражение, его 6 юнитов и ссылка для игроков удаляются. Это нельзя отменить.',
    ok: 'Удалить',
  },
});

export const ExtraCancel = meta.story({
  name: 'Cancel calls onCancel only',
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onConfirm).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('alertdialog')).toBeNull();
  },
});

export const ExtraEscape = meta.story({
  name: 'Escape calls onCancel only',
  play: async ({ args, canvas }) => {
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Cancel' })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
});

export const ExtraScrimTap = meta.story({
  name: 'Scrim tap calls onCancel only',
  play: async ({ args, canvasElement }) => {
    const scrim = canvasElement.querySelector<HTMLElement>('[data-scrim]');
    await expect(scrim).not.toBeNull();
    if (scrim) await userEvent.click(scrim);
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
});

export const ExtraConfirm = meta.story({
  name: 'The verb calls onConfirm once',
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
    await expect(args.onConfirm).toHaveBeenCalledOnce();
    await expect(args.onCancel).not.toHaveBeenCalled();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Focus starts on Cancel and Tab stays inside',
  play: async ({ args, canvas }) => {
    const cancel = canvas.getByRole('button', { name: 'Cancel' });
    const clear = canvas.getByRole('button', { name: 'Clear' });
    await waitFor(() => expect(cancel).toHaveFocus());
    await userEvent.tab();
    await expect(clear).toHaveFocus();
    await userEvent.tab();
    await expect(cancel).toHaveFocus();
    await userEvent.tab({ shift: true });
    await expect(clear).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onConfirm).toHaveBeenCalledOnce();
    await expect(args.onCancel).not.toHaveBeenCalled();
  },
});

export const ExtraFocusReturn = meta.story({
  name: 'Focus returns to the opener on close',
  args: { opened: false, withOpener: true },
  play: async ({ args, canvas }) => {
    await expect(canvas.queryByRole('alertdialog')).toBeNull();
    const opener = canvas.getByRole('button', { name: 'Clear combat' });
    await userEvent.click(opener);
    await canvas.findByRole('alertdialog', { name: 'Clear combat?' });
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Cancel' })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await waitFor(() => expect(opener).toHaveFocus());
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alertdialog', { name: 'Очистить бой?' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Отмена' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Очистить' })).toBeVisible();
  },
});

export const ExtraTapTextThenEscape = meta.story({
  name: 'Tap on the text, then Escape',
  play: async ({ args, canvas }) => {
    const dialog = canvas.getByRole('alertdialog', { name: 'Clear combat?' });
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Cancel' })).toHaveFocus());
    await userEvent.click(canvas.getByText(/All 6 units are removed/));
    await expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await userEvent.tab();
    await expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await userEvent.click(canvas.getByRole('heading', { name: 'Clear combat?' }));
    await userEvent.keyboard('{Escape}');
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
});

export const ExtraOverSheet = meta.story({
  name: 'Escape over an open Sheet closes only the Dialog',
  render: (args) => <OverSheetCell {...args} />,
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
    const cancel = await canvas.findByRole('button', { name: 'Cancel' });
    await waitFor(() => expect(cancel).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onSheetClose).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('alertdialog')).toBeNull();
    await expect(canvas.getByRole('dialog', { name: 'Clear combat' })).toBeVisible();
  },
});

export const ExtraScrollLock = meta.story({
  name: 'Page scroll is locked while open',
  args: { opened: false, withOpener: true },
  play: async ({ canvas, canvasElement }) => {
    const before = document.body.style.overflow;
    await userEvent.click(canvas.getByRole('button', { name: 'Clear combat' }));
    await canvas.findByRole('alertdialog');
    await expect(getComputedStyle(document.body).overflow).toBe('hidden');
    await expect(document.body).toHaveAttribute('data-scroll-locked');
    const wheel = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
    canvasElement.dispatchEvent(wheel);
    await expect(wheel.defaultPrevented).toBe(true);
    await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }));
    await expect(document.body.style.overflow).toBe(before);
  },
});

export const ExtraOneUnit = meta.story({
  name: 'Clear with one unit',
  args: { units: 1 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('The only unit is removed and every player claim is released.'),
    ).toBeVisible();
  },
});

export const ExtraEmptyFr = meta.story({
  name: 'Clear with no units, fr',
  globals: { locale: 'fr' },
  args: { units: 0 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('0 unité est retirée et chaque attribution de joueur est libérée.'),
    ).toBeVisible();
    await expect(canvas.queryByText(/L’unique unité/)).toBeNull();
  },
});

export const ExtraPluralRu = meta.story({
  name: 'Delete combat, ru plurals',
  globals: { locale: 'ru' },
  args: { preset: 'deleteCombat', units: 3 },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(
        'Сражение, его 3 юнита и ссылка для игроков удаляются. Это нельзя отменить.',
      ),
    ).toBeVisible();
  },
});
