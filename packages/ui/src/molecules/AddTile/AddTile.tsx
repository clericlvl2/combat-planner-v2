import type { Icon } from '@tabler/icons-react';
import type { ComponentPropsWithoutRef } from 'react';
import { useId } from 'react';
import { iconSizes } from '../../theme.ts';
import classes from './AddTile.module.css';

export interface AddTileProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'onClick' | 'type'
> {
  label: string;
  icon: Icon;
  onClick: () => void;
  disabled?: boolean;
  hint?: string;
}

export function AddTile({
  label,
  icon: IconComponent,
  onClick,
  disabled = false,
  hint,
  className,
  ...buttonProps
}: AddTileProps) {
  const hintId = useId();
  return (
    <button
      {...buttonProps}
      type="button"
      className={className ? `${classes.root} ${className}` : classes.root}
      disabled={disabled}
      aria-label={label}
      aria-describedby={hint ? hintId : undefined}
      onClick={onClick}
    >
      <span className={classes.line}>
        <IconComponent className={classes.icon} size={iconSizes.M} stroke={2} aria-hidden="true" />
        <span className={classes.label}>{label}</span>
      </span>
      {hint ? (
        <span id={hintId} className={classes.hint}>
          {hint}
        </span>
      ) : null}
    </button>
  );
}
