import { UnstyledButton } from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import type { ComponentPropsWithoutRef, CSSProperties, MouseEventHandler, ReactNode } from 'react';
import type { ConditionName } from '../../theme.ts';
import { iconSizes } from '../../theme.ts';
import classes from './Chip.module.css';

export type ChipVariant = 'tag' | 'add' | 'condition' | 'status' | 'meta';

export type ChipSize = 'S' | 'M' | 'L';

export interface ChipProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'onClick' | 'disabled' | 'type'
> {
  children: ReactNode;
  variant?: ChipVariant;
  size?: ChipSize;
  condition?: ConditionName;
  selected?: boolean;
  count?: number;
  icon?: Icon;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onRemove?: () => void;
}

const tappable = new Set<ChipVariant>(['tag', 'add']);

export function Chip({
  children,
  variant: variantProp,
  size: sizeProp,
  condition,
  selected = false,
  count,
  icon,
  disabled = false,
  onClick,
  onRemove,
  className,
  style,
  ...rest
}: ChipProps) {
  const variant = variantProp ?? (condition ? 'condition' : 'tag');
  const size = sizeProp ?? (tappable.has(variant) ? 'L' : 'S');
  const IconComponent = icon ?? (variant === 'add' ? IconPlus : undefined);
  const removable = onRemove !== undefined;
  const conditionColors =
    variant === 'condition'
      ? ({
          '--chip-fill': `var(--cp-condition-${condition ?? 'fear'}-fill)`,
          '--chip-text': `var(--cp-condition-${condition ?? 'fear'}-text)`,
        } as CSSProperties)
      : undefined;
  const data = {
    className: className ? `${classes.root} ${className}` : classes.root,
    style: conditionColors ? { ...conditionColors, ...style } : style,
    'data-variant': variant,
    'data-size': size,
    'data-condition': condition,
    'data-selected': selected || undefined,
    'data-removable': removable || undefined,
  };
  const content = (
    <>
      {IconComponent ? (
        <IconComponent className={classes.icon} size={iconSizes.S} stroke={2} aria-hidden="true" />
      ) : null}
      <span className={classes.label}>{children}</span>
      {count === undefined ? null : <span className={classes.count}>{count}</span>}
      {removable ? (
        <IconX className={classes.icon} size={iconSizes.S} stroke={2} aria-hidden="true" />
      ) : null}
    </>
  );
  if (onClick === undefined && onRemove === undefined) {
    return (
      <span {...rest} {...data} data-disabled={disabled || undefined}>
        {content}
      </span>
    );
  }
  return (
    <UnstyledButton
      {...rest}
      {...data}
      component="button"
      type="button"
      aria-pressed={removable || variant !== 'tag' ? undefined : selected}
      disabled={disabled}
      onClick={removable ? () => onRemove() : onClick}
    >
      {content}
    </UnstyledButton>
  );
}
