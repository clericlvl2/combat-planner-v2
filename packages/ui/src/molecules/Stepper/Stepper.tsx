import { UnstyledButton } from '@mantine/core';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { useId, useState } from 'react';
import type { ComponentPropsWithoutRef, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './Stepper.module.css';

export type StepperSize = 'S' | 'M' | 'L';

export interface StepperProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onChange'
> {
  value: number | null;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  signed?: boolean;
  label?: string;
  size?: StepperSize;
  disabled?: boolean;
}

const MINUS = '−';

const EMPTY = '—';

function format(value: number | null, signed: boolean): string {
  if (value === null) return EMPTY;
  if (value < 0) return `${MINUS}${Math.abs(value)}`;
  if (signed) return `+${value}`;
  return String(value);
}

function parse(text: string): number | null {
  const normalized = text.replace(MINUS, '-').replace('+', '');
  if (!/^-?\d+$/.test(normalized)) return null;
  return Number(normalized);
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  signed = min < 0,
  label,
  size = 'M',
  disabled = false,
  className,
  ...rest
}: StepperProps) {
  const { t } = useTranslation('Stepper');
  const inputId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  const base = value ?? 0;
  const atMin = disabled || (value !== null && value <= min);
  const atMax = disabled || (value !== null && value >= max);

  const commit = (next: number) => {
    const clamped = clamp(next);
    if (clamped !== value) onChange(clamped);
  };

  const handleText = (text: string) => {
    const typed = text.replace(EMPTY, '');
    if (!/^[-+−]?\d*$/.test(typed)) return;
    setDraft(typed);
  };

  const handleBlur = () => {
    if (draft !== null) {
      const typed = parse(draft);
      if (typed !== null) commit(typed);
    }
    setDraft(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
      return;
    }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    setDraft(null);
    commit(base + (event.key === 'ArrowUp' ? step : -step));
  };

  const field = (
    <input
      id={inputId}
      className={classes.field}
      type="text"
      role="spinbutton"
      inputMode={min < 0 ? 'text' : 'numeric'}
      autoComplete="off"
      aria-label={label ? undefined : t('value')}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value ?? undefined}
      value={draft ?? format(value, signed)}
      disabled={disabled}
      onChange={(event) => handleText(event.currentTarget.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );

  return (
    <div
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      data-size={size}
      data-disabled={disabled || undefined}
      data-labelled={label ? '' : undefined}
    >
      {label ? (
        <div className={classes.column}>
          <label className={classes.label} htmlFor={inputId}>
            {label}
          </label>
          {field}
        </div>
      ) : null}
      <UnstyledButton
        component="button"
        type="button"
        className={classes.key}
        aria-label={label ? t('decreaseField', { label }) : t('decrease')}
        aria-controls={inputId}
        disabled={atMin}
        onClick={() => commit(base - step)}
      >
        <IconMinus size={20} stroke={2} aria-hidden="true" />
      </UnstyledButton>
      {label ? null : field}
      <UnstyledButton
        component="button"
        type="button"
        className={classes.key}
        aria-label={label ? t('increaseField', { label }) : t('increase')}
        aria-controls={inputId}
        disabled={atMax}
        onClick={() => commit(base + step)}
      >
        <IconPlus size={20} stroke={2} aria-hidden="true" />
      </UnstyledButton>
    </div>
  );
}
