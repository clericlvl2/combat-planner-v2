import { FocusTrap, RemoveScroll, useProps } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import { useId, useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { ScrollList } from '../../molecules/ScrollList/ScrollList.tsx';
import { iconSizes } from '../../theme.ts';
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
  lockScroll?: boolean;
  trapFocus?: boolean;
  loading?: boolean;
}

const defaultProps = {
  tone: 'danger',
  lockScroll: true,
  trapFocus: true,
} satisfies Partial<DialogProps>;

export function Dialog(props: DialogProps) {
  const {
    icon: IconComponent,
    title,
    body,
    confirmLabel,
    onConfirm,
    onCancel,
    tone,
    opened,
    lockScroll,
    trapFocus,
    loading,
  } = useProps('CpDialog', defaultProps, props);
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

  if (!opened) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    onCancel();
  };

  return (
    <RemoveScroll enabled={lockScroll}>
      <div className={classes.root} onKeyDown={handleKeyDown}>
        <div className={classes.scrim} data-scrim="" aria-hidden="true" onClick={onCancel} />
        <div className={classes.inner}>
          <FocusTrap active={trapFocus}>
            <ScrollList
              role="alertdialog"
              tabIndex={-1}
              data-mantine-stop-propagation="true"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={bodyId}
              className={classes.dialog}
              contentClassName={classes.content}
              data-tone={tone}
            >
              <span className={classes.icon} aria-hidden="true">
                <IconComponent size={iconSizes.L} stroke={2} />
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
                    loading={loading}
                    onClick={onConfirm}
                    data-mantine-stop-propagation="true"
                  >
                    {confirmLabel}
                  </Button>
                </div>
              </div>
            </ScrollList>
          </FocusTrap>
        </div>
      </div>
    </RemoveScroll>
  );
}
