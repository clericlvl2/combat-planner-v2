import { LIMITS } from '@combat-planner/domain';
import { UnstyledButton, VisuallyHidden } from '@mantine/core';
import { useId } from 'react';
import type { HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './DefenseLine.module.css';

export type DefenseStat = 'ac' | 'pd' | 'md';

export type DefenseModDirection = 'up' | 'down';

export interface DefenseLineProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  ac: number | null;
  pd: number | null;
  md: number | null;
  acMod?: number;
  pdMod?: number;
  mdMod?: number;
  onEdit?: () => void;
}

const nbsp = ' ';

export const defenseTotal = (base: number, mod: number): number =>
  Math.min(LIMITS.defense.max, Math.max(LIMITS.defense.min, base + mod));

export const modDirection = (mod: number): DefenseModDirection | undefined => {
  if (mod > 0) return 'up';
  if (mod < 0) return 'down';
  return undefined;
};

export function DefenseLine({
  ac,
  pd,
  md,
  acMod = 0,
  pdMod = 0,
  mdMod = 0,
  onEdit,
  className,
  ...rest
}: DefenseLineProps) {
  const { t } = useTranslation('DefenseLine');
  const descriptionId = useId();
  const stats = [
    { stat: 'ac', base: ac, mod: acMod },
    { stat: 'pd', base: pd, mod: pdMod },
    { stat: 'md', base: md, mod: mdMod },
  ] as const satisfies readonly { stat: DefenseStat; base: number | null; mod: number }[];
  const shown = stats.map(({ stat, base, mod }) => ({
    stat,
    total: base === null ? null : defenseTotal(base, mod),
    direction: base === null ? undefined : modDirection(mod),
  }));
  const text = shown.map(({ stat, total }) => `${t(stat)}${nbsp}${total ?? '—'}`).join(`${nbsp}· `);
  const chips = shown.map(({ stat, total, direction }) => (
    <span
      key={stat}
      className={classes.chip}
      data-stat={stat}
      data-empty={total === null || undefined}
      data-mod={direction}
    >
      <span className={classes.label}>{t(stat)}</span>
      <span className={classes.value}>{total ?? '—'}</span>
    </span>
  ));
  const rootClass = className ? `${classes.root} ${className}` : classes.root;

  if (onEdit) {
    return (
      <UnstyledButton
        {...rest}
        component="button"
        type="button"
        className={`${rootClass} ${classes.edit}`}
        aria-label={t('edit')}
        aria-describedby={descriptionId}
        onClick={onEdit}
      >
        <span className={classes.chips} aria-hidden="true">
          {chips}
        </span>
        <VisuallyHidden id={descriptionId}>{text}</VisuallyHidden>
      </UnstyledButton>
    );
  }

  return (
    <span {...rest} className={rootClass} role="group" aria-label={text}>
      {chips}
    </span>
  );
}
