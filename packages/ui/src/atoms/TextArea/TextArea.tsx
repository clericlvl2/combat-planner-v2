import { LIMITS } from '@combat-planner/domain';
import { IconAlertCircle } from '@tabler/icons-react';
import { useId } from 'react';
import type { ChangeEvent, ComponentPropsWithoutRef, CSSProperties } from 'react';
import { iconSizes } from '../../theme.ts';
import classes from './TextArea.module.css';

export interface TextAreaProps extends Omit<
  ComponentPropsWithoutRef<'textarea'>,
  'value' | 'defaultValue' | 'onChange' | 'children' | 'rows' | 'disabled' | 'maxLength'
> {
  label?: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  counter?: boolean;
  rows?: number;
  error?: string;
  disabled?: boolean;
}

const lineHeight = 24;

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  maxLength = LIMITS.combatDescription,
  counter = true,
  rows = 3,
  error,
  disabled = false,
  id,
  className,
  ...rest
}: TextAreaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const counterId = `${inputId}-counter`;
  const errorId = `${inputId}-error`;
  const showCounter = counter && maxLength !== undefined;
  const over = maxLength !== undefined && value.length > maxLength;
  const describedBy = [error ? errorId : null, showCounter ? counterId : null]
    .filter(Boolean)
    .join(' ');
  const minHeight = { '--area-min-height': `${rows * lineHeight}px` } as CSSProperties;

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(event.target.value);
  };

  return (
    <div className={className ? `${classes.root} ${className}` : classes.root} style={minHeight}>
      {label || showCounter ? (
        <div className={classes.head}>
          {label ? (
            <label className={classes.label} htmlFor={inputId}>
              {label}
            </label>
          ) : (
            <span />
          )}
          {showCounter ? (
            <span id={counterId} className={classes.counter} data-over={over || undefined}>
              {`${value.length}/${maxLength}`}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className={classes.control} data-replica={value || placeholder || ''}>
        <textarea
          {...rest}
          id={inputId}
          className={classes.input}
          rows={1}
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          data-error={error ? true : undefined}
          onChange={handleChange}
        />
      </div>
      {error ? (
        <span id={errorId} className={classes.error}>
          <IconAlertCircle
            className={classes.errorIcon}
            size={iconSizes.S}
            stroke={2}
            aria-hidden="true"
          />
          {error}
        </span>
      ) : null}
    </div>
  );
}
