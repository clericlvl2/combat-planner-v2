import { Popover, UnstyledButton } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import { cloneElement, Fragment, useEffect, useRef } from 'react';
import type { HTMLAttributes, KeyboardEvent, ReactElement, ReactNode } from 'react';
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

export interface MenuProps {
  items: readonly MenuItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
  opened: boolean;
  target?: ReactElement<Record<string, unknown>>;
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
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!opened || !inline) return;
    const handlePointerDown = (event: PointerEvent) => {
      const panelNode = panelRef.current;
      if (panelNode && event.target instanceof Node && !panelNode.contains(event.target)) {
        onCloseRef.current();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [opened, inline]);

  useEffect(() => {
    if (!opened || inline) return;
    enabledItems(panelRef.current)[0]?.focus();
  }, [opened, inline]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
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

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  const panel = (
    <div
      ref={panelRef}
      role="menu"
      aria-label={ariaLabel}
      aria-orientation="vertical"
      className={classes.menu}
      style={{ width }}
      onKeyDown={handleKeyDown}
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
      onDismiss={onClose}
      position="bottom-end"
      offset={8}
      withRoles={false}
      withinPortal={false}
      closeOnEscape={false}
      returnFocus
    >
      <Popover.Target>
        {cloneElement(target, { 'data-open': opened ? '' : undefined })}
      </Popover.Target>
      <Popover.Dropdown className={classes.dropdown}>{panel}</Popover.Dropdown>
    </Popover>
  );
}
