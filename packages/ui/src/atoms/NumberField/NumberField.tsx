import { LIMITS } from '@combat-planner/domain';
import { IconAlertCircle } from '@tabler/icons-react';
import { useId, useRef, useState } from 'react';
import type { ComponentPropsWithoutRef, CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { iconSizes } from '../../theme.ts';
import classes from './NumberField.module.css';

export interface NumberFieldProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onChange'
> {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  inputMode?: 'numeric' | 'none';
  error?: string;
  disabled?: boolean;
}

function format(value: number | null): string {
  return value === null ? '' : String(value);
}

export function NumberField({
  label,
  value,
  onChange,
  min = LIMITS.amount.min,
  max = LIMITS.amount.max,
  step = 1,
  inputMode = 'numeric',
  error,
  disabled = false,
  className,
  ...rest
}: NumberFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const digits = Math.max(String(min).length, String(max).length);
  const inputStyle = { '--number-digits': digits } as CSSProperties;
  const errorId = useId();
  const [draft, setDraft] = useState(format(value));
  const [shownValue, setShownValue] = useState(value);
  if (value !== shownValue) {
    setShownValue(value);
    setDraft(format(value));
  }

  const allowed = min < 0 ? /^-?\d*$/ : /^\d*$/;
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  const commit = (next: number | null) => {
    setDraft(format(next));
    setShownValue(next);
    if (next !== value) onChange(next);
  };

  const handleText = (text: string) => {
    if (!allowed.test(text)) return;
    if (text === '' || text === '-') {
      setDraft(text);
      setShownValue(null);
      if (value !== null) onChange(null);
      return;
    }
    const typed = Number(text);
    commit(typed > max || (typed < min && typed < 0) ? clamp(typed) : typed);
  };

  const handleBlur = () => {
    if (value === null) {
      setDraft('');
      return;
    }
    if (value < min || value > max) commit(clamp(value));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const delta = event.key === 'ArrowUp' ? step : -step;
    commit(clamp((value ?? 0) + delta));
  };

  const handleFrameMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled || event.target === inputRef.current) return;
    event.preventDefault();
    inputRef.current?.focus();
  };

  return (
    <div {...rest} className={className ? `${classes.root} ${className}` : classes.root}>
      <div className={classes.field} data-field="" onMouseDown={handleFrameMouseDown}>
        <label className={classes.label} htmlFor={inputId}>
          {label}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          className={classes.input}
          style={inputStyle}
          size={digits}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          placeholder="0"
          value={draft}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => handleText(event.currentTarget.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </div>
      {error ? (
        <span id={errorId} className={classes.error}>
          <IconAlertCircle size={iconSizes.S} stroke={2} aria-hidden="true" />
          {error}
        </span>
      ) : null}
    </div>
  );
}
