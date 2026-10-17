import { Modal } from '@mantine/core';
import { IconChevronLeft, IconX } from '@tabler/icons-react';
import { Children, Fragment, isValidElement, useCallback, useRef } from 'react';
import type { ReactElement, ReactNode, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import { useMotion } from '../../provider.tsx';
import classes from './Sheet.module.css';

export interface SheetProps {
  title: string;
  header?: ReactNode;
  subtitle?: string;
  onBack?: () => void;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  opened: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
}

function isFragment(node: ReactNode): node is ReactElement<{ children?: ReactNode }> {
  return isValidElement(node) && node.type === Fragment;
}

function flattenActions(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((child) =>
    isFragment(child) ? flattenActions(child.props.children) : [child],
  );
}

export function Sheet({
  title,
  header,
  subtitle,
  onBack,
  onClose,
  children,
  actions,
  opened,
  initialFocus,
}: SheetProps) {
  const { t } = useTranslation('Sheet');
  const motion = useMotion();
  const actionList = flattenActions(actions);
  const initialFocusRef = useRef(initialFocus);
  initialFocusRef.current = initialFocus;

  const attachSheet = useCallback((sheet: HTMLElement | null) => {
    if (!sheet) return;
    const target = initialFocusRef.current?.current;
    if (target) {
      target.setAttribute('data-autofocus', '');
      return;
    }
    const timer = setTimeout(() => sheet.focus({ preventScroll: true }));
    return () => clearTimeout(timer);
  }, []);

  return (
    <Modal.Root
      opened={opened}
      onClose={onClose}
      transitionProps={motion === 'off' ? { duration: 0 } : undefined}
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
      <Modal.Content ref={attachSheet} aria-label={header === undefined ? undefined : title}>
        <div className={classes.header} data-autofocus={initialFocus ? undefined : ''}>
          {onBack ? (
            <IconButton
              icon={IconChevronLeft}
              variant="outline"
              aria-label={t('back')}
              onClick={onBack}
            />
          ) : null}
          {header === undefined ? (
            <div className={classes.heading}>
              <Modal.Title>{title}</Modal.Title>
              {subtitle ? <Modal.Body>{subtitle}</Modal.Body> : null}
            </div>
          ) : (
            <div className={classes.custom}>{header}</div>
          )}
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
