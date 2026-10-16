import { IconAlertCircle } from '@tabler/icons-react';
import { useId } from 'react';
import type { ChangeEvent, ComponentPropsWithoutRef, KeyboardEvent } from 'react';
import classes from './TextField.module.css';

export type TextFieldSize = 'S' | 'M' | 'L';

export interface TextFieldProps extends Omit<
  ComponentPropsWithoutRef<'textarea'>,
  'value' | 'defaultValue' | 'onChange' | 'children' | 'rows' | 'disabled' | 'maxLength'
> {
  label?: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  counter?: boolean;
  error?: string;
  disabled?: boolean;
  size?: TextFieldSize;
}

const lineBreaks = /\r\n|\r|\n/g;

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  counter = maxLength !== undefined,
  error,
  disabled = false,
  size = 'M',
  id,
  className,
  onKeyDown,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const counterId = `${inputId}-counter`;
  const errorId = `${inputId}-error`;
  const showCounter = counter && maxLength !== undefined;
  const over = maxLength !== undefined && value.length > maxLength;
  const describedBy = [error ? errorId : null, showCounter ? counterId : null]
    .filter(Boolean)
    .join(' ');

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(event.target.value.replace(lineBreaks, ' '));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault();
    onKeyDown?.(event);
  };

  return (
    <div className={className ? `${classes.root} ${className}` : classes.root} data-size={size}>
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
          aria-multiline="false"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          data-error={error ? true : undefined}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </div>
      {error ? (
        <span id={errorId} className={classes.error}>
          <IconAlertCircle className={classes.errorIcon} size={16} stroke={2} aria-hidden="true" />
          {error}
        </span>
      ) : null}
    </div>
  );
}
