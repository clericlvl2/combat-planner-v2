import { FocusTrap } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import { useId, useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import classes from './Dialog.module.css';

export type DialogTone = 'ink' | 'danger';

export interface DialogProps {
  icon: Icon;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: DialogTone;
  opened: boolean;
}

export function Dialog({
  icon: IconComponent,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  tone = 'danger',
  opened,
}: DialogProps) {
  const { t } = useTranslation('Dialog');
  const titleId = useId();
  const bodyId = useId();
  const opener = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!opened) return;
    const active = document.activeElement;
    opener.current = active instanceof HTMLElement ? active : null;
    return () => {
      opener.current?.focus();
    };
  }, [opened]);

  useLayoutEffect(() => {
    if (!opened) return;
    const { style } = document.body;
    const overflow = style.overflow;
    style.overflow = 'hidden';
    return () => {
      style.overflow = overflow;
    };
  }, [opened]);

  if (!opened) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    onCancel();
  };

  return (
    <div className={classes.root} onKeyDown={handleKeyDown}>
      <div className={classes.scrim} data-scrim="" aria-hidden="true" onClick={onCancel} />
      <div className={classes.inner}>
        <FocusTrap active>
          <div
            role="alertdialog"
            tabIndex={-1}
            data-mantine-stop-propagation="true"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            className={classes.dialog}
            data-tone={tone}
          >
            <span className={classes.icon} aria-hidden="true">
              <IconComponent size={24} stroke={2} />
            </span>
            <h2 id={titleId} className={classes.title}>
              {title}
            </h2>
            <p id={bodyId} className={classes.body}>
              {body}
            </p>
            <div className={classes.actions}>
              <div className={classes.action}>
                <Button
                  variant="secondary"
                  size="M"
                  fullWidth
                  onClick={onCancel}
                  data-autofocus=""
                  data-mantine-stop-propagation="true"
                >
                  {t('cancel')}
                </Button>
              </div>
              <div className={classes.action}>
                <Button
                  variant={tone === 'ink' ? 'primary' : 'danger'}
                  size="M"
                  fullWidth
                  onClick={onConfirm}
                  data-mantine-stop-propagation="true"
                >
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </div>
        </FocusTrap>
      </div>
    </div>
  );
}
