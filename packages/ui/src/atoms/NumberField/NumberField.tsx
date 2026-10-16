import { IconAlertCircle } from '@tabler/icons-react';
import { useId, useState } from 'react';
import type { ComponentPropsWithoutRef, KeyboardEvent } from 'react';
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
  min = 0,
  max = 999,
  step = 1,
  inputMode = 'numeric',
  error,
  disabled = false,
  className,
  ...rest
}: NumberFieldProps) {
  const inputId = useId();
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

  return (
    <div {...rest} className={className ? `${classes.root} ${className}` : classes.root}>
      <div className={classes.field}>
        <label className={classes.label} htmlFor={inputId}>
          {label}
        </label>
        <input
          id={inputId}
          className={classes.input}
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
          <IconAlertCircle size={16} stroke={2} aria-hidden="true" />
          {error}
        </span>
      ) : null}
    </div>
  );
}
