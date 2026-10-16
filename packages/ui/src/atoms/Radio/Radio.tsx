import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import classes from './Radio.module.css';

export type RadioSize = 'S' | 'M' | 'L';

export interface RadioProps extends Omit<
  ComponentPropsWithoutRef<'label'>,
  'children' | 'onChange'
> {
  checked: boolean;
  onChange: (value: string) => void;
  name: string;
  value: string;
  label?: ReactNode;
  size?: RadioSize;
  disabled?: boolean;
  'aria-label'?: string;
}

export function Radio({
  checked,
  onChange,
  name,
  value,
  label,
  size = 'M',
  disabled = false,
  'aria-label': ariaLabel,
  className,
  ...rest
}: RadioProps) {
  return (
    <label
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      data-size={size}
    >
      <span className={classes.ring}>
        <input
          className={classes.input}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(event) => {
            if (event.currentTarget.checked) onChange(value);
          }}
        />
        {checked ? <span className={classes.dot} aria-hidden="true" /> : null}
      </span>
      {label ? <span className={classes.label}>{label}</span> : null}
    </label>
  );
}
