import { useId } from 'react';
import type { ComponentPropsWithoutRef, KeyboardEvent } from 'react';
import { Radio } from '../../atoms/Radio/Radio.tsx';
import classes from './RadioList.module.css';

export type RadioListSize = 'S' | 'M' | 'L';

export interface RadioListOption<T extends string> {
  value: T;
  label: string;
  sub?: string;
  disabled?: boolean;
}

export interface RadioListProps<T extends string> extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onChange' | 'aria-label'
> {
  options: readonly RadioListOption<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-label': string;
  size?: RadioListSize;
}

export function RadioList<T extends string>({
  options,
  value,
  onChange,
  size = 'M',
  className,
  ...rest
}: RadioListProps<T>) {
  const name = useId();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, option: RadioListOption<T>) => {
    if (event.key !== 'Enter' || option.disabled) return;
    event.preventDefault();
    if (option.value !== value) onChange(option.value);
  };

  return (
    <div
      {...rest}
      role="radiogroup"
      className={className ? `${classes.root} ${className}` : classes.root}
      data-size={size}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <div
            key={option.value}
            className={classes.row}
            data-selected={checked || undefined}
            onKeyDown={(event) => handleKeyDown(event, option)}
          >
            <Radio
              className={classes.radio}
              name={name}
              value={option.value}
              checked={checked}
              disabled={option.disabled}
              onChange={() => onChange(option.value)}
              label={
                <span className={classes.text}>
                  <span className={classes.label}>{option.label}</span>
                  {option.sub ? <span className={classes.sub}>{option.sub}</span> : null}
                </span>
              }
            />
          </div>
        );
      })}
    </div>
  );
}
