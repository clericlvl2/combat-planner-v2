import { UnstyledButton } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import classes from './Swatch.module.css';

export const combatColors = [
  '#B4232A',
  '#A85400',
  '#8A6A00',
  '#2E7A43',
  '#0E5E63',
  '#1E5FA8',
  '#5C4026',
  '#6E685F',
] as const;

export type CombatColor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type SwatchSize = 'S' | 'M' | 'L';

export interface SwatchProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'color' | 'onClick' | 'onSelect' | 'disabled' | 'type' | 'aria-label'
> {
  color: CombatColor;
  selected?: boolean;
  size?: SwatchSize;
  disabled?: boolean;
  onSelect?: (color: CombatColor) => void;
  'aria-label': string;
}

const checkSize: Record<SwatchSize, number> = { S: 16, M: 20, L: 24 };

export function Swatch({
  color,
  selected = false,
  size = 'M',
  disabled = false,
  onSelect,
  className,
  style,
  ...rest
}: SwatchProps) {
  const fill = { '--swatch-fill': combatColors[color] } as CSSProperties;
  return (
    <UnstyledButton
      {...rest}
      component="button"
      type="button"
      className={className ? `${classes.root} ${className}` : classes.root}
      style={style ? { ...fill, ...style } : fill}
      data-size={size}
      data-color={color}
      data-selected={selected || undefined}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelect?.(color)}
    >
      {selected ? (
        <IconCheck
          className={classes.check}
          size={checkSize[size]}
          stroke={2}
          aria-hidden="true"
          data-check=""
        />
      ) : null}
    </UnstyledButton>
  );
}
