import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconBookmark,
  IconCheck,
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
import { storyT } from '../../storybook/storyT.ts';

type ToastKind = 'preset' | 'cap' | 'link' | 'failed' | 'undone';

interface ToastCellProps extends Omit<ToastProps, 'message' | 'icon' | 'tone' | 'action'> {
  kind: ToastKind;
  message?: string;
  name?: string;
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
};

const unitName = 'Orc Berserker';

function ToastCell({
  kind,
  message,
  name = unitName,
  actionLabel,
  onAction,
  onHide,
  deferred = false,
  ...props
}: ToastCellProps) {
  const { t } = useTranslation('Toast');
  const [open, setOpen] = useState(!deferred);
  const messages: Record<ToastKind, string> = {
    preset: t('presetAdded', { name }),
    cap: t('unitCap', { limit: LIMITS.unitsPerCombat }),
    link: t('linkCopied'),
    failed: t('serverUnreachable'),
    undone: t('undoneDamage', { amount: 12, name }),
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

export const ErrorWithAction = meta.story({ tags: ['visual'] });

export const Warning = meta.story({
  args: { kind: 'cap' },
});

export const Success = meta.story({
  tags: ['visual'],
  args: { kind: 'link' },
});

export const Neutral = meta.story({
  args: { kind: 'undone' },
});

export const LongErrorWithAction = meta.story({
  args: {
    kind: 'failed',
    message:
      'Не удалось сохранить изменения: сервер не отвечает уже больше минуты. Ничего не изменилось.',
    actionLabel: 'Повторить попытку',
  },
});

export const LongMessage = meta.story({
  tags: ['visual'],
  args: { kind: 'preset', name: 'Brother Tomas of the Silver Lantern Order' },
});

export const ActionFiresOnAction = meta.story({
  tags: ['!dev'],
  args: { kind: 'failed', onAction: fn(), onHide: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Toast');
    await userEvent.click(canvas.getByRole('button', { name: t('retry') }));
    await expect(args.onAction).toHaveBeenCalledOnce();
    await expect(args.onHide).toHaveBeenCalledOnce();
  },
});

export const DismissHidesAtOnce = meta.story({
  tags: ['!dev'],
  args: { kind: 'link', onHide: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Toast');
    await expect(args.onHide).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: t('dismiss') }));
    await expect(args.onHide).toHaveBeenCalledOnce();
  },
});

export const DismissHidesAfterExit = meta.story({
  tags: ['!dev'],
  parameters: { motion: 'on' },
  args: { kind: 'link', onHide: fn(), deferred: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Toast');
    await userEvent.click(canvas.getByRole('button', { name: t('show') }));
    await userEvent.click(canvas.getByRole('button', { name: t('dismiss') }));
    await expect(args.onHide).not.toHaveBeenCalled();
    await waitFor(() => expect(args.onHide).toHaveBeenCalledOnce());
    await expect(canvas.queryByRole('status')).toBeNull();
  },
});

export const ActionRunsOnceDuringExit = meta.story({
  tags: ['!dev'],
  parameters: { motion: 'on' },
  args: { kind: 'failed', onAction: fn(), onHide: fn(), deferred: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Toast');
    await userEvent.click(canvas.getByRole('button', { name: t('show') }));
    const retry = canvas.getByRole('button', { name: t('retry') });
    await userEvent.click(retry);
    await userEvent.click(retry);
    await expect(args.onHide).not.toHaveBeenCalled();
    await expect(args.onAction).toHaveBeenCalledOnce();
    await waitFor(() => expect(args.onHide).toHaveBeenCalledOnce());
    await expect(canvas.queryByRole('status')).toBeNull();
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
});

const enterDurationOf = (element: HTMLElement) => getComputedStyle(element).animationDuration;

const delaysOf = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.map((call) => call[1]);

export const AutoHidesAfterDuration = meta.story({
  tags: ['!dev'],
  parameters: { motion: 'on' },
  args: { kind: 'link', onHide: fn(), duration: 200, deferred: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Toast');
    await userEvent.click(canvas.getByRole('button', { name: t('show') }));
    await expect(canvas.getByRole('status')).toHaveTextContent(t('linkCopied'));
    await expect(args.onHide).not.toHaveBeenCalled();
    await waitFor(() => expect(args.onHide).toHaveBeenCalledOnce(), { timeout: 2000 });
    await expect(canvas.queryByRole('status')).toBeNull();
  },
});

export const PlainToastStaysFourSeconds = meta.story({
  tags: ['!dev'],
  parameters: { motion: 'on' },
  args: { kind: 'link', onHide: fn(), deferred: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Toast');
    const setTimeoutSpy = spyOn(globalThis, 'setTimeout');
    try {
      await userEvent.click(canvas.getByRole('button', { name: t('show') }));
      const status = canvas.getByRole('status');
      await expect(enterDurationOf(status)).toBe('0.15s');
      await expect(delaysOf(setTimeoutSpy)).toContain(4000);
      await expect(delaysOf(setTimeoutSpy)).not.toContain(8000);
      for (const animation of status.getAnimations()) animation.finish();
      await expect(status).toBeVisible();
      await expect(args.onHide).not.toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
    }
  },
});

export const ActionToastStaysEightSeconds = meta.story({
  tags: ['!dev'],
  parameters: { motion: 'on' },
  args: { kind: 'failed', onHide: fn(), deferred: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Toast');
    const setTimeoutSpy = spyOn(globalThis, 'setTimeout');
    try {
      await userEvent.click(canvas.getByRole('button', { name: t('show') }));
      const status = canvas.getByRole('status');
      await expect(enterDurationOf(status)).toBe('0.15s');
      await expect(delaysOf(setTimeoutSpy)).toContain(8000);
      await expect(delaysOf(setTimeoutSpy)).not.toContain(4000);
      for (const animation of status.getAnimations()) animation.finish();
      await expect(canvas.getByRole('button', { name: t('retry') })).toBeVisible();
      await expect(args.onHide).not.toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
    }
  },
});

export const MotionOffKeepsToast = meta.story({
  tags: ['!dev'],
  args: { kind: 'link', onHide: fn(), deferred: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Toast');
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
      await userEvent.click(canvas.getByRole('button', { name: t('show') }));
      await expect(setTimeoutSpy).not.toHaveBeenCalledWith(
        expect.any(Function),
        toastDuration.plain,
      );
      await expect(canvas.getByRole('status')).toHaveTextContent(t('linkCopied'));
      await expect(args.onHide).not.toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
    }
    await userEvent.click(canvas.getByRole('button', { name: t('dismiss') }));
    await expect(args.onHide).toHaveBeenCalledOnce();
    await expect(canvas.queryByRole('status')).toBeNull();
  },
});

export const SitsAboveBottomBar = meta.story({
  tags: ['!dev'],
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

export const SitsAtBottomWithoutBar = meta.story({
  tags: ['!dev'],
  args: { kind: 'link', aboveBottomBar: false },
  play: async ({ canvas, canvasElement }) => {
    const frame = canvasElement.querySelector<HTMLElement>('[data-phone-frame]');
    const toastBox = canvas.getByRole('status').getBoundingClientRect();
    await expect((frame?.getBoundingClientRect().bottom ?? 0) - toastBox.bottom).toBe(
      layout.toast.withoutBar,
    );
  },
});
