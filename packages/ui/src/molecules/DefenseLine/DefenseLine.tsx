import type { HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { StatSquare } from '../../atoms/StatSquare/StatSquare.tsx';
import type { StatName } from '../../atoms/StatSquare/StatSquare.tsx';
import classes from './DefenseLine.module.css';

export type DefenseLineVariant = 'line' | 'squares';

export interface DefenseLineProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  ac: number | null;
  pd: number | null;
  md: number | null;
  variant?: DefenseLineVariant;
}

const nbsp = ' ';

export function DefenseLine({
  ac,
  pd,
  md,
  variant = 'line',
  className,
  ...rest
}: DefenseLineProps) {
  const { t } = useTranslation('DefenseLine');
  const stats: { stat: StatName; value: number | null }[] = [
    { stat: 'ac', value: ac },
    { stat: 'pd', value: pd },
    { stat: 'md', value: md },
  ];
  const text = stats.map(({ stat, value }) => `${t(stat)}${nbsp}${value ?? '—'}`).join(`${nbsp}· `);
  const rootClass = className ? `${classes.root} ${className}` : classes.root;
  if (variant === 'squares') {
    return (
      <span {...rest} className={rootClass} data-variant={variant} role="group" aria-label={text}>
        {stats.map(({ stat, value }) => (
          <StatSquare key={stat} stat={stat} label={t(stat)} value={value} />
        ))}
      </span>
    );
  }
  return (
    <span {...rest} className={rootClass} data-variant={variant}>
      {text}
    </span>
  );
}
