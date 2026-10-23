import { UnstyledButton } from '@mantine/core';
import type { Icon } from '@tabler/icons-react';
import type { ComponentPropsWithoutRef, MouseEventHandler, ReactNode } from 'react';
import { Link } from 'react-router';
import classes from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export type ButtonSize = 'S' | 'M' | 'L';

export interface ButtonProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'onClick' | 'disabled' | 'type'
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: Icon;
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  to?: string;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'M',
  icon: IconComponent,
  fullWidth = false,
  disabled = false,
  onClick,
  to,
  children,
  className,
  ...rest
}: ButtonProps) {
  const heavy = (variant === 'primary' || variant === 'danger') && size !== 'S';
  const content = (
    <>
      {IconComponent ? (
        <IconComponent className={classes.icon} size={20} stroke={2} aria-hidden="true" />
      ) : null}
      <span className={classes.label}>{children}</span>
    </>
  );
  if (to !== undefined) {
    return (
      <Link
        className={className ? `${classes.root} ${className}` : classes.root}
        to={to}
        data-variant={variant}
        data-size={size}
        data-heavy={heavy || undefined}
        data-full-width={fullWidth || undefined}
      >
        {content}
      </Link>
    );
  }
  return (
    <UnstyledButton
      {...rest}
      component="button"
      type="button"
      className={className ? `${classes.root} ${className}` : classes.root}
      data-variant={variant}
      data-size={size}
      data-heavy={heavy || undefined}
      data-full-width={fullWidth || undefined}
      disabled={disabled}
      onClick={onClick}
    >
      {content}
    </UnstyledButton>
  );
}
