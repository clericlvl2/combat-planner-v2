import { LIMITS } from '@combat-planner/domain';
import { IconAlertCircle } from '@tabler/icons-react';
import { useId, useRef } from 'react';
import type { ChangeEvent, HTMLAttributes, KeyboardEvent, MouseEvent } from 'react';
import classes from './TextField.module.css';

export type TextFieldSize = 'S' | 'M' | 'L';

export type TextFieldType = 'email' | 'password';

export interface TextFieldProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'defaultValue' | 'onChange' | 'children'
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
  type?: TextFieldType;
  name?: string;
  autoComplete?: string;
  required?: boolean;
  readOnly?: boolean;
}

const lineBreaks = /\r\n|\r|\n/g;

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type,
  maxLength = type ? undefined : LIMITS.unitName,
  counter = maxLength !== undefined && type === undefined,
  error,
  disabled = false,
  size = 'M',
  id,
  className,
  onKeyDown,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const inputId = id ?? generatedId;
  const counterId = `${inputId}-counter`;
  const errorId = `${inputId}-error`;
  const showCounter = counter && maxLength !== undefined;
  const over = maxLength !== undefined && value.length > maxLength;
  const describedBy = [error ? errorId : null, showCounter ? counterId : null]
    .filter(Boolean)
    .join(' ');

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange?.(event.target.value.replace(lineBreaks, ' '));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault();
    onKeyDown?.(event);
  };

  const handleFrameMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === inputRef.current || disabled) return;
    event.preventDefault();
    inputRef.current?.focus();
  };

  const shared = {
    ...rest,
    ref: inputRef,
    id: inputId,
    className: classes.input,
    value,
    placeholder,
    maxLength,
    disabled,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
    'data-error': error ? true : undefined,
    onChange: handleChange,
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
      <div
        className={classes.control}
        data-field=""
        data-error={error ? true : undefined}
        data-disabled={disabled || undefined}
        onMouseDown={handleFrameMouseDown}
      >
        {type ? (
          <input {...shared} type={type} onKeyDown={onKeyDown} />
        ) : (
          <div className={classes.grow} data-replica={value || placeholder || ''}>
            <textarea {...shared} rows={1} onKeyDown={handleKeyDown} />
          </div>
        )}
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
