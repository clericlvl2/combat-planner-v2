import preview from '#.storybook/preview';
import { IconRefresh, IconTrash, IconUserMinus } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { Button } from '../../atoms/Button/Button.tsx';
import { Sheet } from '../Sheet/Sheet.tsx';
import { Dialog } from './Dialog.tsx';
import type { DialogTone } from './Dialog.tsx';
import { storyT } from '../../storybook/storyT.ts';

type Preset = 'restart' | 'clear' | 'remove';

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

function OverSheetCell({
  opened: initiallyOpened = false,
  onConfirm,
  onCancel,
  onSheetClose,
}: DialogCellProps) {
  const spec = usePresets(6).clear;
  const [sheetOpened, setSheetOpened] = useState(true);
  const [dialogOpened, setDialogOpened] = useState(initiallyOpened);
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

export const Default = meta.story({ tags: ['visual'] });

export const Restart = meta.story({
  args: { preset: 'restart' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Dialog');
    const dialog = canvas.getByRole('alertdialog', { name: t('restartTitle') });
    await expect(dialog).toHaveAccessibleDescription(t('restartBody'));
    await expect(canvas.getByRole('button', { name: t('restart') })).toBeVisible();
  },
});

export const LongTitle = meta.story({
  tags: ['visual'],
  args: { preset: 'remove', title: 'Remove Brother Tomas of the Silver Lantern Order?' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Dialog');
    const cancel = canvas.getByRole('button', { name: t('cancel') });
    const remove = canvas.getByRole('button', { name: t('remove') });
    await expect(cancel.getBoundingClientRect().width).toBe(remove.getBoundingClientRect().width);
  },
});

export const LongBody = meta.story({
  args: {
    body: 'Бой «Засада у переправы», его шесть юнитов, история хитов и ссылка для игроков удаляются навсегда. Игроки, открывшие ссылку, увидят, что бой больше недоступен. Это нельзя отменить.',
  },
});

export const OverASheet = meta.story({
  args: { opened: true },
  render: (args) => <OverSheetCell {...args} />,
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Dialog');
    await expect(await canvas.findByRole('alertdialog', { name: t('clearTitle') })).toBeVisible();
    await expect(canvas.getByRole('dialog', { name: 'Clear combat' })).toBeInTheDocument();
  },
});

export const CancelCallsOnCancel = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Dialog');
    await userEvent.click(canvas.getByRole('button', { name: t('cancel') }));
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onConfirm).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('alertdialog')).toBeNull();
  },
});

export const EscapeCancels = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Dialog');
    await waitFor(() => expect(canvas.getByRole('button', { name: t('cancel') })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
});

export const ScrimTapCancels = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvasElement }) => {
    const scrim = canvasElement.querySelector<HTMLElement>('[data-scrim]');
    await expect(scrim).not.toBeNull();
    if (scrim) await userEvent.click(scrim);
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
});

export const ConfirmCallsOnConfirm = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Dialog');
    await userEvent.click(canvas.getByRole('button', { name: t('clear') }));
    await expect(args.onConfirm).toHaveBeenCalledOnce();
    await expect(args.onCancel).not.toHaveBeenCalled();
  },
});

export const FocusStaysInside = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Dialog');
    const cancel = canvas.getByRole('button', { name: t('cancel') });
    const clear = canvas.getByRole('button', { name: t('clear') });
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

export const FocusReturnsToOpener = meta.story({
  tags: ['!dev'],
  args: { opened: false, withOpener: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Dialog');
    await expect(canvas.queryByRole('alertdialog')).toBeNull();
    const opener = canvas.getByRole('button', { name: 'Clear combat' });
    await userEvent.click(opener);
    await canvas.findByRole('alertdialog', { name: t('clearTitle') });
    await waitFor(() => expect(canvas.getByRole('button', { name: t('cancel') })).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await waitFor(() => expect(opener).toHaveFocus());
  },
});

export const TapTextThenEscapeCancels = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Dialog');
    const dialog = canvas.getByRole('alertdialog', { name: t('clearTitle') });
    await waitFor(() => expect(canvas.getByRole('button', { name: t('cancel') })).toHaveFocus());
    await userEvent.click(canvas.getByText(t('clearBody', { count: 6 })));
    await expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await userEvent.tab();
    await expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await userEvent.click(canvas.getByRole('heading', { name: t('clearTitle') }));
    await userEvent.keyboard('{Escape}');
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
});

export const EscapeOverSheetClosesDialog = meta.story({
  tags: ['!dev'],
  render: (args) => <OverSheetCell {...args} />,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Dialog');
    await userEvent.click(canvas.getByRole('button', { name: t('clear') }));
    const cancel = await canvas.findByRole('button', { name: t('cancel') });
    await waitFor(() => expect(cancel).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await expect(args.onCancel).toHaveBeenCalledOnce();
    await expect(args.onSheetClose).not.toHaveBeenCalled();
    await expect(canvas.queryByRole('alertdialog')).toBeNull();
    await expect(canvas.getByRole('dialog', { name: 'Clear combat' })).toBeVisible();
  },
});

export const ScrollLockedWhileOpen = meta.story({
  tags: ['!dev'],
  args: { opened: false, withOpener: true },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'Dialog');
    const before = document.body.style.overflow;
    await userEvent.click(canvas.getByRole('button', { name: 'Clear combat' }));
    await canvas.findByRole('alertdialog');
    await expect(getComputedStyle(document.body).overflow).toBe('hidden');
    await expect(document.body).toHaveAttribute('data-scroll-locked');
    const wheel = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
    canvasElement.dispatchEvent(wheel);
    await expect(wheel.defaultPrevented).toBe(true);
    await userEvent.click(canvas.getByRole('button', { name: t('cancel') }));
    await expect(document.body.style.overflow).toBe(before);
  },
});

export const ClearWithOneUnit = meta.story({
  tags: ['!dev'],
  args: { units: 1 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Dialog');
    await expect(canvas.getByText(t('clearBody', { count: 1 }))).toBeVisible();
  },
});
