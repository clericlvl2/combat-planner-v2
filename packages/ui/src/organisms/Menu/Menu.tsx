import { Popover, UnstyledButton } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import { useMergedRef } from '@mantine/hooks';
import { cloneElement, Fragment, useCallback, useEffect, useRef } from 'react';
import type {
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
  Ref,
} from 'react';
import classes from './Menu.module.css';

export type MenuItemTone = 'ink' | 'danger';

export interface MenuItem {
  id: string;
  icon: Icon;
  label: string;
  tone?: MenuItemTone;
  disabled?: boolean;
  hint?: string;
  divider?: boolean;
}

export interface MenuTargetProps {
  ref?: Ref<HTMLElement>;
  'data-open'?: string;
}

export interface MenuProps {
  items: readonly MenuItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
  opened: boolean;
  target?: ReactElement<MenuTargetProps>;
  width?: number;
  'aria-label'?: string;
}

export interface PopoverFrameProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: string;
  sub?: string;
  width?: number;
  children: ReactNode;
}

const MENU_WIDTH = 260;

const ITEM_SELECTOR = '[role="menuitem"]:not(:disabled)';

export function PopoverFrame({
  title,
  sub,
  width,
  children,
  className,
  style,
  ...rest
}: PopoverFrameProps) {
  return (
    <div
      {...rest}
      className={className ? `${classes.popover} ${className}` : classes.popover}
      style={width === undefined ? style : { ...style, width }}
    >
      {title ? (
        <span className={classes.title}>
          {title}
          {sub ? <span className={classes.sub}> · {sub}</span> : null}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function enabledItems(panel: HTMLElement | null): HTMLElement[] {
  return panel ? [...panel.querySelectorAll<HTMLElement>(ITEM_SELECTOR)] : [];
}

function sourceButtonOf(root: HTMLElement | null): HTMLElement | null {
  if (!root || root.matches('button')) return root;
  return root.querySelector<HTMLElement>('[aria-haspopup]') ?? root;
}

function focusFirstItem(panel: HTMLElement, framesLeft: number) {
  const first = enabledItems(panel)[0];
  if (!first || !panel.isConnected) return;
  first.focus({ preventScroll: true });
  if (document.activeElement !== first && framesLeft > 0) {
    requestAnimationFrame(() => focusFirstItem(panel, framesLeft - 1));
  }
}

const FOCUS_FRAMES = 30;

export function Menu({
  items,
  onSelect,
  onClose,
  opened,
  target,
  width = MENU_WIDTH,
  'aria-label': ariaLabel,
}: MenuProps) {
  const inline = target === undefined;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const sourceRef = useRef<HTMLElement | null>(null);
  const targetRef = useMergedRef(target?.props.ref, sourceRef);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const closeAndReturnFocus = useCallback(() => {
    onCloseRef.current();
    sourceButtonOf(sourceRef.current)?.focus();
  }, []);

  const setPanel = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      if (node && !inline) focusFirstItem(node, FOCUS_FRAMES);
    },
    [inline],
  );

  useEffect(() => {
    if (!opened) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (panelRef.current?.contains(event.target)) return;
      if (sourceButtonOf(sourceRef.current)?.contains(event.target)) return;
      onCloseRef.current();
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const active = document.activeElement;
      const inPanel = panelRef.current?.contains(active) === true;
      const onSource = sourceRef.current?.contains(active) === true;
      if (!inPanel && !onSource) return;
      event.preventDefault();
      event.stopPropagation();
      closeAndReturnFocus();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [opened, closeAndReturnFocus]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      if (inline) {
        onClose();
        return;
      }
      event.preventDefault();
      closeAndReturnFocus();
      return;
    }
    const enabled = enabledItems(panelRef.current);
    if (enabled.length === 0) return;
    const current = enabled.findIndex((node) => node === document.activeElement);
    const last = enabled.length - 1;
    let next: number;
    if (event.key === 'ArrowDown') next = current < 0 || current === last ? 0 : current + 1;
    else if (event.key === 'ArrowUp') next = current <= 0 ? last : current - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    enabled[next]?.focus();
  };

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(ITEM_SELECTOR)) return;
    event.preventDefault();
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    closeAndReturnFocus();
  };

  const panel = (
    <div
      ref={setPanel}
      role="menu"
      aria-label={ariaLabel}
      aria-orientation="vertical"
      tabIndex={-1}
      className={classes.menu}
      style={{ width }}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
    >
      {items.map((item) => {
        const ItemIcon = item.icon;
        return (
          <Fragment key={item.id}>
            {item.divider ? <span className={classes.divider} role="separator" /> : null}
            <UnstyledButton
              component="button"
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={classes.item}
              data-tone={item.tone ?? 'ink'}
              data-item={item.id}
              disabled={item.disabled === true}
              onClick={() => handleSelect(item.id)}
            >
              <span className={classes.iconCircle} aria-hidden="true">
                <ItemIcon size={20} stroke={2} />
              </span>
              <span className={classes.label}>{item.label}</span>
              {item.hint ? <span className={classes.hint}>{item.hint}</span> : null}
            </UnstyledButton>
          </Fragment>
        );
      })}
    </div>
  );

  if (inline) return opened ? panel : null;

  return (
    <Popover
      opened={opened}
      position="bottom-end"
      offset={8}
      withRoles={false}
      withinPortal={false}
      closeOnEscape={false}
      closeOnClickOutside={false}
    >
      <Popover.Target>
        {cloneElement(target, { ref: targetRef, 'data-open': opened ? '' : undefined })}
      </Popover.Target>
      <Popover.Dropdown className={classes.dropdown}>{panel}</Popover.Dropdown>
    </Popover>
  );
}
