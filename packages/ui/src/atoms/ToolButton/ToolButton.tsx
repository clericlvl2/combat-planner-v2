import { UnstyledButton } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import type { ComponentPropsWithoutRef, MouseEventHandler } from 'react';
import classes from './ToolButton.module.css';

export type ToolButtonSize = 'S' | 'M' | 'L';

export interface ToolButtonProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'onClick' | 'disabled' | 'type'
> {
  icon: Icon;
  label?: string;
  count?: number;
  size?: ToolButtonSize;
  active?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

const iconSize: Record<ToolButtonSize, number> = { S: 16, M: 20, L: 24 };

export function ToolButton({
  icon: IconComponent,
  label,
  count,
  size = 'M',
  active = false,
  disabled = false,
  type = 'button',
  onClick,
  className,
  ...rest
}: ToolButtonProps) {
  return (
    <UnstyledButton
      {...rest}
      component="button"
      type={type}
      className={className ? `${classes.root} ${className}` : classes.root}
      data-size={size}
      data-active={active || undefined}
      data-labelled={label ? true : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      <IconComponent className={classes.icon} size={iconSize[size]} stroke={2} aria-hidden="true" />
      {label ? <span className={classes.label}>{label}</span> : null}
      {count === undefined ? null : <span className={classes.count}>{count}</span>}
    </UnstyledButton>
  );
}
