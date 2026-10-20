import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconBookmark,
  IconCheck,
  IconCopy,
  IconTrash,
  IconWifiOff,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, spyOn, userEvent, waitFor } from 'storybook/test';
import { layout } from '../../layout.ts';
import { Button } from '../../atoms/Button/Button.tsx';
import { Toast, toastDuration } from './Toast.tsx';
import type { ToastProps, ToastTone } from './Toast.tsx';

type ToastKind = 'preset' | 'cap' | 'link' | 'failed' | 'undone' | 'duplicated' | 'deleted';

interface ToastCellProps extends Omit<ToastProps, 'message' | 'icon' | 'tone' | 'action'> {
  kind: ToastKind;
  message?: string;
  actionLabel?: string;
  onAction: () => void;
  deferred?: boolean;
}

const tones: Record<ToastKind, { icon: Icon; tone: ToastTone }> = {
  preset: { icon: IconBookmark, tone: 'success' },
  cap: { icon: IconAlertTriangle, tone: 'warning' },
  link: { icon: IconCheck, tone: 'success' },
  failed: { icon: IconWifiOff, tone: 'error' },
  undone: { icon: IconArrowBackUp, tone: 'neutral' },
  duplicated: { icon: IconCopy, tone: 'success' },
  deleted: { icon: IconTrash, tone: 'neutral' },
};

const unitName = 'Orc Berserker';

const combatTitle = 'Ambush at the Ferry';

function ToastCell({
  kind,
  message,
  actionLabel,
  onAction,
  onHide,
  deferred = false,
  ...props
}: ToastCellProps) {
  const { t } = useTranslation('Toast');
  const [open, setOpen] = useState(!deferred);
  const messages: Record<ToastKind, string> = {
    preset: t('presetAdded', { name: unitName }),
    cap: t('unitCap', { limit: LIMITS.unitsPerCombat }),
    link: t('linkCopied'),
    failed: t('serverUnreachable'),
    undone: t('undoneDamage', { amount: 12, name: unitName }),
    duplicated: t('duplicated', { title: combatTitle }),
    deleted: t('deleted', { title: combatTitle }),
  };
  const label = actionLabel ?? (kind === 'failed' ? t('retry') : undefined);
  return (
    <>
      {deferred ? (
        <Button size="S" onClick={() => setOpen(true)}>
          {t('show')}
        </Button>
      ) : null}
      {open ? (
        <Toast
          {...props}
          {...tones[kind]}
          message={message ?? messages[kind]}
          action={label === undefined ? undefined : { label, onAction }}
          onHide={() => {
            if (deferred) setOpen(false);
            onHide();
          }}
        />
      ) : null}
    </>
  );
}

const meta = preview.meta({
  title: 'Molecules/Toast',
  component: ToastCell,
  parameters: { phoneFrame: true },
  args: { kind: 'failed' as ToastKind, onHide: fn(), onAction: fn() },
});

export const Anatomy = meta.story({});

export const Preset = meta.story({
  name: 'preset',
  args: { kind: 'preset' },
});

export const Cap = meta.story({
  name: 'cap',
  args: { kind: 'cap' },
});

export const Link = meta.story({
  name: 'link',
  args: { kind: 'link' },
});

export const Failed = meta.story({
  name: 'failed',
  args: { kind: 'failed' },
});

export const Undone = meta.story({
  name: 'undone',
  args: { kind: 'undone' },
});

export const Duplicated = meta.story({
  name: 'duplicated',
  args: { kind: 'duplicated' },
});

export const Deleted = meta.story({
  name: 'deleted',
  args: { kind: 'deleted' },
});

export const RuErrorAction = meta.story({
  name: 'ru, error + action',
  args: {
    kind: 'failed',
    message: 'Не удалось связаться с сервером. Ничего не изменилось.',
    actionLabel: 'Повторить',
  },
});

export const LongUnitName = meta.story({
  name: 'Long unit name',
  args: { kind: 'preset', message: 'Brother Tomas of the Silver Lantern Order added to Library' },
});

export const ExtraAction = meta.story({
  name: 'Action fires onAction',
  args: { kind: 'failed', onAction: fn(), onHide: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
    await expect(args.onAction).toHaveBeenCalledOnce();
    await expect(args.onHide).toHaveBeenCalledOnce();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter on the action',
  args: { kind: 'failed', onAction: fn(), onHide: fn() },
  play: async ({ args, canvas }) => {
    const retry = canvas.getByRole('button', { name: 'Retry' });
    await userEvent.tab();
    await expect(retry).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onAction).toHaveBeenCalledOnce();
    await expect(args.onHide).toHaveBeenCalledOnce();
  },
});

export const ExtraKeyboardDismiss = meta.story({
  name: 'Keyboard: Space on dismiss',
  args: { kind: 'failed', onAction: fn(), onHide: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.tab();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Dismiss' })).toHaveFocus();
    await expect(args.onHide).not.toHaveBeenCalled();
    await userEvent.keyboard('[Space]');
    await expect(args.onHide).toHaveBeenCalledOnce();
    await expect(args.onAction).not.toHaveBeenCalled();
  },
});

export const ExtraDismissMotionOff = meta.story({
  name: 'Dismiss with motion off hides at once',
  args: { kind: 'link', onHide: fn() },
  play: async ({ args, canvas }) => {
    await expect(args.onHide).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss' }));
    await expect(args.onHide).toHaveBeenCalledOnce();
  },
});

export const ExtraDismissMotionOn = meta.story({
  name: 'Dismiss with motion on hides after the exit',
  parameters: { motion: 'on' },
  args: { kind: 'link', onHide: fn(), deferred: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss' }));
    await expect(args.onHide).not.toHaveBeenCalled();
    await waitFor(() => expect(args.onHide).toHaveBeenCalledOnce());
    await expect(canvas.queryByRole('status')).toBeNull();
  },
});

export const ExtraActionOnceDuringExit = meta.story({
  name: 'A second tap on the action during the exit runs nothing',
  parameters: { motion: 'on' },
  args: { kind: 'failed', onAction: fn(), onHide: fn(), deferred: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }));
    const retry = canvas.getByRole('button', { name: 'Retry' });
    await userEvent.click(retry);
    await userEvent.click(retry);
    await expect(args.onHide).not.toHaveBeenCalled();
    await expect(args.onAction).toHaveBeenCalledOnce();
    await waitFor(() => expect(args.onHide).toHaveBeenCalledOnce());
    await expect(canvas.queryByRole('status')).toBeNull();
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
});

export const ExtraAutoHide = meta.story({
  name: 'Auto-hide after an injected duration',
  parameters: { motion: 'on' },
  args: { kind: 'link', onHide: fn(), duration: 200, deferred: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }));
    await expect(canvas.getByRole('status')).toHaveTextContent('Link copied');
    await expect(args.onHide).not.toHaveBeenCalled();
    await waitFor(() => expect(args.onHide).toHaveBeenCalledOnce(), { timeout: 2000 });
    await expect(canvas.queryByRole('status')).toBeNull();
  },
});

export const ExtraDefaultDuration = meta.story({
  name: 'Default duration 4 s',
  parameters: { motion: 'on' },
  args: { kind: 'link', onHide: fn(), deferred: true },
  play: async ({ args, canvas }) => {
    const setTimeoutSpy = spyOn(globalThis, 'setTimeout');
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }));
      const status = canvas.getByRole('status');
      for (const animation of status.getAnimations()) animation.finish();
      await expect(status.getAnimations()).toHaveLength(0);
      await expect(status).toBeVisible();
      await expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), toastDuration.plain);
      await expect(setTimeoutSpy).not.toHaveBeenCalledWith(
        expect.any(Function),
        toastDuration.withAction,
      );
      await expect(toastDuration.plain).toBe(4000);
      await expect(args.onHide).not.toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
    }
  },
});

export const ExtraActionDuration = meta.story({
  name: 'Default duration 8 s with an action',
  parameters: { motion: 'on' },
  args: { kind: 'failed', onHide: fn(), deferred: true },
  play: async ({ args, canvas }) => {
    const setTimeoutSpy = spyOn(globalThis, 'setTimeout');
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }));
      const status = canvas.getByRole('status');
      for (const animation of status.getAnimations()) animation.finish();
      await expect(status.getAnimations()).toHaveLength(0);
      await expect(canvas.getByRole('button', { name: 'Retry' })).toBeVisible();
      await expect(setTimeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        toastDuration.withAction,
      );
      await expect(toastDuration.withAction).toBe(8000);
      await expect(args.onHide).not.toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
    }
  },
});

export const ExtraMotionOffStays = meta.story({
  name: 'Motion off keeps the toast past its duration',
  args: { kind: 'link', onHide: fn(), deferred: true },
  play: async ({ args, canvas }) => {
    const realSetTimeout = globalThis.setTimeout;
    const elapse = (handler: TimerHandler, delay?: number, ...rest: unknown[]) => {
      if (delay === toastDuration.plain && typeof handler === 'function') {
        handler();
        return 0;
      }
      return realSetTimeout(handler, delay, ...rest);
    };
    const setTimeoutSpy = spyOn(globalThis, 'setTimeout').mockImplementation(
      elapse as typeof setTimeout,
    );
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }));
      await expect(setTimeoutSpy).not.toHaveBeenCalledWith(
        expect.any(Function),
        toastDuration.plain,
      );
      await expect(canvas.getByRole('status')).toHaveTextContent('Link copied');
      await expect(args.onHide).not.toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
    }
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss' }));
    await expect(args.onHide).toHaveBeenCalledOnce();
    await expect(canvas.queryByRole('status')).toBeNull();
  },
});

export const ExtraPosition = meta.story({
  name: 'Position above the bottom bar',
  args: { kind: 'link' },
  play: async ({ canvas, canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>('[data-phone-frame]');
    const frameBox = frame?.getBoundingClientRect();
    const toastBox = canvas.getByRole('status').getBoundingClientRect();
    await expect(toastBox.left - (frameBox?.left ?? 0)).toBe(layout.toast.inset);
    await expect((frameBox?.right ?? 0) - toastBox.right).toBe(layout.toast.inset);
    await expect((frameBox?.bottom ?? 0) - toastBox.bottom).toBe(layout.toast.bottom);
  },
});

export const ExtraWithoutBottomBar = meta.story({
  name: 'Position without a bottom bar',
  args: { kind: 'link', aboveBottomBar: false },
  play: async ({ canvas, canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>('[data-phone-frame]');
    const toastBox = canvas.getByRole('status').getBoundingClientRect();
    await expect((frame?.getBoundingClientRect().bottom ?? 0) - toastBox.bottom).toBe(
      layout.toast.withoutBar,
    );
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { kind: 'failed' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Повторить' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Закрыть' })).toBeVisible();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { kind: 'cap' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'この戦闘にはすでに99体のユニットがいます',
    );
  },
});
