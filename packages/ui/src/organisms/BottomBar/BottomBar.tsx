import { useId } from 'react';
import { Button } from '../../atoms/Button/Button.tsx';
import type { ButtonProps } from '../../atoms/Button/Button.tsx';
import classes from './BottomBar.module.css';

export interface BottomBarProps extends Omit<
  ButtonProps,
  'variant' | 'size' | 'fullWidth' | 'children' | 'icon'
> {
  label: string;
  icon: NonNullable<ButtonProps['icon']>;
  hint?: string;
  onClick: NonNullable<ButtonProps['onClick']>;
}

export function BottomBar({ label, icon, hint, disabled = false, ...buttonProps }: BottomBarProps) {
  const hintId = useId();
  return (
    <div className={classes.root}>
      {hint ? (
        <span id={hintId} className={classes.hint}>
          {hint}
        </span>
      ) : null}
      <Button
        {...buttonProps}
        variant="primary"
        size="L"
        icon={icon}
        fullWidth
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
      >
        {label}
      </Button>
    </div>
  );
}
