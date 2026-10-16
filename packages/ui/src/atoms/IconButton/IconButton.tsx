import { UnstyledButton } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import type { ComponentPropsWithoutRef, MouseEventHandler } from 'react';
import classes from './IconButton.module.css';

export type IconButtonVariant = 'outline' | 'plain' | 'soft' | 'filled';

export type IconButtonSize = 'S' | 'M' | 'L';

export interface IconButtonProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'onClick' | 'disabled' | 'type' | 'aria-label'
> {
  icon: Icon;
  'aria-label': string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

const iconSize: Record<IconButtonVariant, Record<IconButtonSize, number>> = {
  outline: { S: 16, M: 20, L: 24 },
  plain: { S: 16, M: 24, L: 24 },
  soft: { S: 16, M: 20, L: 24 },
  filled: { S: 16, M: 20, L: 24 },
};

export function IconButton({
  icon: IconComponent,
  variant = 'outline',
  size = 'M',
  disabled = false,
  type = 'button',
  onClick,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <UnstyledButton
      {...rest}
      component="button"
      type={type}
      className={className ? `${classes.root} ${className}` : classes.root}
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      onClick={onClick}
    >
      <IconComponent
        className={classes.icon}
        size={iconSize[variant][size]}
        stroke={2}
        aria-hidden="true"
      />
    </UnstyledButton>
  );
}
