import { IconCheck } from '@tabler/icons-react';
import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react';
import type { ConditionName } from '../../theme.ts';
import classes from './Checkbox.module.css';

export type CheckboxShape = 'square' | 'round';

export type CheckboxSize = 'S' | 'M' | 'L';

const checkSize: Record<CheckboxSize, number> = { S: 12, M: 14, L: 16 };

export interface CheckboxProps extends Omit<
  ComponentPropsWithoutRef<'label'>,
  'children' | 'onChange'
> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  shape?: CheckboxShape;
  size?: CheckboxSize;
  condition?: ConditionName;
  disabled?: boolean;
  name?: string;
  'aria-label'?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  shape = 'square',
  size = 'M',
  condition,
  disabled = false,
  name,
  'aria-label': ariaLabel,
  className,
  style,
  ...rest
}: CheckboxProps) {
  const conditionStyle = condition
    ? ({ '--checkbox-on': `var(--cp-condition-${condition}-text)` } as CSSProperties)
    : undefined;
  return (
    <label
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      style={conditionStyle ? { ...conditionStyle, ...style } : style}
      data-shape={shape}
      data-size={size}
    >
      <span className={classes.mark}>
        <input
          className={classes.input}
          type="checkbox"
          name={name}
          checked={checked}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        {checked ? <IconCheck size={checkSize[size]} stroke={2} aria-hidden="true" /> : null}
      </span>
      {label ? <span className={classes.label}>{label}</span> : null}
    </label>
  );
}
