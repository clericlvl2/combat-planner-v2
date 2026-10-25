import { Modal, useProps } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { IconChevronLeft, IconX } from '@tabler/icons-react';
import {
  Children,
  Fragment,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactElement, ReactNode, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import { useSheetDrag } from '../../hooks/useSheetDrag.ts';
import { layout } from '../../layout.ts';
import { ScrollList } from '../../molecules/ScrollList/ScrollList.tsx';
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
  autoFocus?: boolean;
}

const defaultProps = { autoFocus: true } satisfies Partial<SheetProps>;

function isFragment(node: ReactNode): node is ReactElement<{ children?: ReactNode }> {
  return isValidElement(node) && node.type === Fragment;
}

const transition = {
  transition: 'slide-up',
  duration: layout.sheetEnterMs,
  exitDuration: layout.sheetExitMs,
  timingFunction: layout.sheetEasing,
} as const;

const instant = { duration: 0 } as const;

const textEntry = 'input:not([type="checkbox"], [type="radio"]), textarea';

function flattenActions(node: ReactNode): ReactNode[] {
  return Children.toArray(node).flatMap((child) =>
    isFragment(child) ? flattenActions(child.props.children) : [child],
  );
}

export function Sheet(props: SheetProps) {
  const {
    title,
    header,
    subtitle,
    onBack,
    onClose,
    children,
    actions,
    opened,
    initialFocus,
    autoFocus,
  } = useProps('CpSheet', defaultProps, props);
  const { t } = useTranslation('Sheet');
  const motion = useMotion();
  const reduced = useReducedMotion();
  const actionList = flattenActions(actions);
  const initialFocusRef = useRef(initialFocus);
  initialFocusRef.current = initialFocus;
  const autoFocusRef = useRef(autoFocus);
  autoFocusRef.current = autoFocus;
  const animated = motion !== 'off' && !reduced;
  const [entering, setEntering] = useState(opened && animated);
  const [present, setPresent] = useState(opened);
  if (opened && !present) setPresent(true);
  const shown = opened && !(entering && animated);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const attachDrag = useSheetDrag({ scrimRef, contentRef, onClose });

  const revealFocused = useCallback(() => {
    const target = document.activeElement;
    if (!(target instanceof HTMLElement) || !target.matches(textEntry)) return;
    if (!contentRef.current?.contains(target)) return;
    target.scrollIntoView({ block: 'nearest', behavior: motion === 'off' ? 'instant' : 'smooth' });
  }, [motion]);

  useEffect(() => {
    if (!entering) return;
    const frame = requestAnimationFrame(() => setEntering(false));
    return () => cancelAnimationFrame(frame);
  }, [entering]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!opened || !viewport) return;
    viewport.addEventListener('resize', revealFocused);
    return () => viewport.removeEventListener('resize', revealFocused);
  }, [opened, revealFocused]);

  const attachSheet = useCallback(
    (sheet: HTMLElement | null) => {
      if (!sheet) return;
      const detach = attachDrag(sheet);
      const target = initialFocusRef.current?.current;
      if (autoFocusRef.current && target) target.setAttribute('data-autofocus', '');
      const timer =
        autoFocusRef.current && !target
          ? setTimeout(() => sheet.focus({ preventScroll: true }))
          : undefined;
      return () => {
        clearTimeout(timer);
        detach?.();
      };
    },
    [attachDrag],
  );

  return (
    <Modal.Root
      opened={shown}
      onClose={onClose}
      onExitTransitionEnd={() => setPresent(false)}
      data-present={present ? '' : undefined}
      transitionProps={animated ? transition : instant}
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
      <Modal.Overlay ref={scrimRef} data-scrim="" />
      <Modal.Content ref={attachSheet} aria-label={header === undefined ? undefined : title}>
        <div className={classes.grip} data-sheet-grip="" aria-hidden="true" />
        <div
          className={classes.header}
          data-sheet-header=""
          data-autofocus={initialFocus ? undefined : ''}
        >
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
        <ScrollList
          className={classes.content}
          contentClassName={classes.body}
          viewportRef={contentRef}
          viewportProps={{ 'data-sheet-content': '', onFocus: revealFocused }}
        >
          {children}
        </ScrollList>
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
