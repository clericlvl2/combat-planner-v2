import { LIMITS } from '@combat-planner/domain';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Swatch } from '../../atoms/Swatch/Swatch.tsx';
import type { CombatColor } from '../../atoms/Swatch/Swatch.tsx';
import classes from './SwatchRow.module.css';

const colorKeys = ['red', 'orange', 'ochre', 'green', 'teal', 'blue', 'brown', 'grey'] as const;

const colors = Array.from(
  { length: LIMITS.color.max - LIMITS.color.min + 1 },
  (_, index) => (LIMITS.color.min + index) as CombatColor,
);

export interface SwatchRowProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onChange'
> {
  value: CombatColor;
  onChange: (value: CombatColor) => void;
  disabled?: boolean;
  'data-tap'?: CombatColor;
}

export function SwatchRow({
  value,
  onChange,
  disabled = false,
  'data-tap': tap,
  'aria-label': ariaLabel,
  className,
  ...rest
}: SwatchRowProps) {
  const { t } = useTranslation('SwatchRow');
  return (
    <div
      {...rest}
      role="group"
      aria-label={ariaLabel ?? t('label')}
      className={className ? `${classes.root} ${className}` : classes.root}
    >
      {colors.map((color) => (
        <Swatch
          key={color}
          className={classes.swatch}
          color={color}
          aria-label={t(colorKeys[color] ?? 'red')}
          selected={color === value}
          disabled={disabled}
          data-tap={color === tap ? '' : undefined}
          onSelect={onChange}
        />
      ))}
    </div>
  );
}
