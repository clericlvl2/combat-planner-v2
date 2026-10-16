import { ROLES } from '@combat-planner/domain';
import type { Role } from '@combat-planner/domain';
import { UnstyledButton } from '@mantine/core';
import { useRef } from 'react';
import type { ComponentPropsWithoutRef, KeyboardEvent } from 'react';
import classes from './Segmented.module.css';

export type SegmentedTone = 'ink' | 'role';

export type SegmentedSize = 'S' | 'M' | 'L';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string> extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onChange' | 'aria-label'
> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-label': string;
  tone?: SegmentedTone;
  size?: SegmentedSize;
  disabled?: boolean;
}

function roleOf(value: string): Role | undefined {
  return ROLES.find((role) => role === value);
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone = 'ink',
  size = 'M',
  disabled = false,
  className,
  style,
  ...rest
}: SegmentedProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = (index: number) => !disabled && options[index]?.disabled !== true;
  const selectedIndex = options.findIndex((option) => option.value === value);
  const tabStop = enabled(selectedIndex)
    ? selectedIndex
    : options.findIndex((_, index) => enabled(index));

  const select = (index: number) => {
    const option = options[index];
    if (!option || !enabled(index)) return;
    buttons.current[index]?.focus();
    if (option.value !== value) onChange(option.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = options.length;
    const walk: Record<string, [number, number]> = {
      ArrowRight: [index + 1, 1],
      ArrowDown: [index + 1, 1],
      ArrowLeft: [index - 1, -1],
      ArrowUp: [index - 1, -1],
      Home: [0, 1],
      End: [count - 1, -1],
    };
    const route = walk[event.key];
    if (!route) return;
    event.preventDefault();
    const [start, step] = route;
    for (let offset = 0; offset < count; offset += 1) {
      const candidate = (((start + offset * step) % count) + count) % count;
      if (enabled(candidate)) {
        select(candidate);
        return;
      }
    }
  };

  return (
    <div
      {...rest}
      role="radiogroup"
      aria-disabled={disabled || undefined}
      className={className ? `${classes.root} ${className}` : classes.root}
      style={{ ...style, gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      data-size={size}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <UnstyledButton
            key={option.value}
            ref={(element: HTMLButtonElement | null) => {
              buttons.current[index] = element;
            }}
            component="button"
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === tabStop ? 0 : -1}
            className={classes.segment}
            data-selected={checked || undefined}
            data-role={tone === 'role' ? roleOf(option.value) : undefined}
            disabled={!enabled(index)}
            onClick={() => select(index)}
            onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => handleKeyDown(event, index)}
          >
            {option.label}
          </UnstyledButton>
        );
      })}
    </div>
  );
}
