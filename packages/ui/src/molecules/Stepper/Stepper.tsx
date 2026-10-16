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
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label?: string;
  size?: StepperSize;
  disabled?: boolean;
}

const MINUS = '−';

function format(value: number, signed: boolean): string {
  if (value < 0) return `${MINUS}${Math.abs(value)}`;
  if (signed && value > 0) return `+${value}`;
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
  label,
  size = 'M',
  disabled = false,
  className,
  ...rest
}: StepperProps) {
  const { t } = useTranslation('Stepper');
  const inputId = useId();
  const signed = min < 0;
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  const atMin = disabled || value <= min;
  const atMax = disabled || value >= max;

  const commit = (next: number) => {
    const clamped = clamp(next);
    if (clamped !== value) onChange(clamped);
  };

  const handleText = (text: string) => {
    if (!/^[-+−]?\d*$/.test(text)) return;
    setDraft(text);
    const typed = parse(text);
    if (typed !== null && typed >= min && typed <= max && typed !== value) onChange(typed);
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
    commit(value + (event.key === 'ArrowUp' ? step : -step));
  };

  return (
    <div
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      data-size={size}
      data-disabled={disabled || undefined}
    >
      {label ? (
        <label className={classes.label} htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <UnstyledButton
        component="button"
        type="button"
        className={classes.key}
        aria-label={t('decrease')}
        aria-controls={inputId}
        disabled={atMin}
        onClick={() => commit(value - step)}
      >
        <IconMinus size={20} stroke={2} aria-hidden="true" />
      </UnstyledButton>
      <input
        id={inputId}
        className={classes.field}
        type="text"
        role="spinbutton"
        inputMode={signed ? 'text' : 'numeric'}
        autoComplete="off"
        aria-label={label ? undefined : t('value')}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        value={draft ?? format(value, signed)}
        disabled={disabled}
        onChange={(event) => handleText(event.currentTarget.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      <UnstyledButton
        component="button"
        type="button"
        className={classes.key}
        aria-label={t('increase')}
        aria-controls={inputId}
        disabled={atMax}
        onClick={() => commit(value + step)}
      >
        <IconPlus size={20} stroke={2} aria-hidden="true" />
      </UnstyledButton>
    </div>
  );
}
