import { UnstyledButton } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { layout } from '../../layout.ts';
import { useMotion } from '../../provider.tsx';
import { iconSizes } from '../../theme.ts';
import classes from './Toast.module.css';

export type ToastTone = 'success' | 'warning' | 'error' | 'neutral';

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastProps {
  message: ReactNode;
  icon: Icon;
  tone?: ToastTone;
  action?: ToastAction;
  onHide: () => void;
  duration?: number | null;
  aboveBottomBar?: boolean;
}

export const toastDuration = { plain: 4000, withAction: 8000, error: 5000 } as const;

export const toastExitDuration = 150;

export const defaultDuration = (tone: ToastTone, hasAction: boolean): number => {
  if (hasAction) return toastDuration.withAction;
  return tone === 'error' ? toastDuration.error : toastDuration.plain;
};

const px = (value: number) => `${value}px`;

export function Toast({
  message,
  icon: IconComponent,
  tone = 'neutral',
  action,
  onHide,
  duration,
  aboveBottomBar = true,
}: ToastProps) {
  const { t } = useTranslation('Toast');
  const motion = useMotion();
  const [leaving, setLeaving] = useState(false);
  const hidden = useRef(false);
  const onHideRef = useRef(onHide);

  useEffect(() => {
    onHideRef.current = onHide;
  }, [onHide]);

  const hide = useCallback(() => {
    if (hidden.current) return;
    hidden.current = true;
    if (motion === 'off') {
      onHideRef.current();
      return;
    }
    setLeaving(true);
  }, [motion]);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => onHideRef.current(), toastExitDuration);
    return () => clearTimeout(timer);
  }, [leaving]);

  const delay = duration === undefined ? defaultDuration(tone, action !== undefined) : duration;

  useEffect(() => {
    if (delay === null || motion === 'off') return;
    const timer = setTimeout(hide, delay);
    return () => clearTimeout(timer);
  }, [delay, hide, motion]);

  const style = {
    '--toast-inset': px(layout.toast.inset),
    '--toast-bottom': px(aboveBottomBar ? layout.toast.bottom : layout.toast.withoutBar),
    '--toast-exit': `${toastExitDuration}ms`,
  } as CSSProperties;

  return (
    <div
      className={classes.root}
      role="status"
      aria-live="polite"
      data-tone={tone}
      data-leaving={leaving || undefined}
      data-motion={motion}
      style={style}
    >
      <span className={classes.tone} aria-hidden="true">
        <IconComponent size={iconSizes.S} stroke={2} />
      </span>
      <span className={classes.message}>{message}</span>
      {action ? (
        <UnstyledButton
          component="button"
          type="button"
          className={classes.action}
          onClick={() => {
            if (hidden.current) return;
            action.onAction();
            hide();
          }}
        >
          {action.label}
        </UnstyledButton>
      ) : null}
      <UnstyledButton
        component="button"
        type="button"
        className={classes.close}
        aria-label={t('dismiss')}
        onClick={hide}
      >
        <IconX size={iconSizes.M} stroke={2} aria-hidden="true" />
      </UnstyledButton>
    </div>
  );
}
