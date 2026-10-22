import type { HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './DefenseLine.module.css';

export type DefenseStat = 'ac' | 'pd' | 'md';

export interface DefenseLineProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  ac: number | null;
  pd: number | null;
  md: number | null;
}

const nbsp = ' ';

export function DefenseLine({ ac, pd, md, className, ...rest }: DefenseLineProps) {
  const { t } = useTranslation('DefenseLine');
  const stats: { stat: DefenseStat; value: number | null }[] = [
    { stat: 'ac', value: ac },
    { stat: 'pd', value: pd },
    { stat: 'md', value: md },
  ];
  const text = stats.map(({ stat, value }) => `${t(stat)}${nbsp}${value ?? '—'}`).join(`${nbsp}· `);
  return (
    <span
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      role="group"
      aria-label={text}
    >
      {stats.map(({ stat, value }) => (
        <span
          key={stat}
          className={classes.chip}
          data-stat={stat}
          data-empty={value === null || undefined}
        >
          <span className={classes.label}>{t(stat)}</span>
          <span className={classes.value}>{value ?? '—'}</span>
        </span>
      ))}
    </span>
  );
}
