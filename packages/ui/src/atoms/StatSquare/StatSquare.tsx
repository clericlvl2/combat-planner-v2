import type { ComponentPropsWithoutRef } from 'react';
import classes from './StatSquare.module.css';

export type StatName = 'ac' | 'pd' | 'md';

export interface StatSquareProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  stat: StatName;
  label: string;
  value: number | null;
}

export function StatSquare({ stat, label, value, className, ...rest }: StatSquareProps) {
  return (
    <span
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      data-stat={stat}
      data-empty={value === null || undefined}
    >
      <span className={classes.label}>{label}</span>
      <span className={classes.value}>{value ?? '—'}</span>
    </span>
  );
}
