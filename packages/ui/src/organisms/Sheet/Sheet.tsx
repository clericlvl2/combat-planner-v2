import { Modal } from '@mantine/core';
import { IconChevronLeft, IconX } from '@tabler/icons-react';
import { Children } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import classes from './Sheet.module.css';

export interface SheetProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
  opened: boolean;
}

export function Sheet({ title, subtitle, onBack, onClose, children, actions, opened }: SheetProps) {
  const { t } = useTranslation('Sheet');
  const actionList = Children.toArray(actions);
  return (
    <Modal.Root
      opened={opened}
      onClose={onClose}
      withinPortal={false}
      classNames={{
        root: classes.root,
        overlay: classes.scrim,
        inner: classes.inner,
        content: classes.sheet,
        title: classes.title,
        body: classes.content,
      }}
    >
      <Modal.Overlay data-scrim="" />
      <Modal.Content>
        <div className={classes.header}>
          {onBack ? (
            <IconButton
              icon={IconChevronLeft}
              variant="outline"
              aria-label={t('back')}
              onClick={onBack}
            />
          ) : null}
          <div className={classes.heading}>
            <Modal.Title tabIndex={-1} data-autofocus="">
              {title}
            </Modal.Title>
            {subtitle ? <p className={classes.subtitle}>{subtitle}</p> : null}
          </div>
          <IconButton icon={IconX} variant="outline" aria-label={t('close')} onClick={onClose} />
        </div>
        <Modal.Body>{children}</Modal.Body>
        {actionList.length > 0 ? (
          <div className={classes.actions}>
            {actionList.map((action, index) => (
              <div key={index} className={classes.action}>
                {action}
              </div>
            ))}
          </div>
        ) : null}
      </Modal.Content>
    </Modal.Root>
  );
}
