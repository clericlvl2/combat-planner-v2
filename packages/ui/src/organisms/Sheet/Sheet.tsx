import { Modal } from '@mantine/core';
import { IconChevronLeft, IconX } from '@tabler/icons-react';
import { Children, Fragment, isValidElement, useEffect, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import classes from './Sheet.module.css';

export interface SheetProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  opened: boolean;
}

function isFragment(node: ReactNode): node is ReactElement<{ children?: ReactNode }> {
  return isValidElement(node) && node.type === Fragment;
}

function flattenActions(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((child) =>
    isFragment(child) ? flattenActions(child.props.children) : [child],
  );
}

export function Sheet({ title, subtitle, onBack, onClose, children, actions, opened }: SheetProps) {
  const { t } = useTranslation('Sheet');
  const actionList = flattenActions(actions);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!opened) return;
    const timer = setTimeout(() => sheetRef.current?.focus({ preventScroll: true }));
    return () => clearTimeout(timer);
  }, [opened]);
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
        body: classes.subtitle,
      }}
    >
      <Modal.Overlay data-scrim="" />
      <Modal.Content ref={sheetRef}>
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
            <Modal.Title>{title}</Modal.Title>
            {subtitle ? <Modal.Body>{subtitle}</Modal.Body> : null}
          </div>
          <IconButton icon={IconX} variant="outline" aria-label={t('close')} onClick={onClose} />
        </div>
        <div className={classes.content} data-sheet-content="">
          {children}
        </div>
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
