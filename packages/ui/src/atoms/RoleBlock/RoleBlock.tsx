import { UnstyledButton } from '@mantine/core';
import type { HTMLAttributes, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import { iconSizes } from '../../theme.ts';
import { IconDiceD20 } from '../icons/IconDiceD20.ts';
import classes from './RoleBlock.module.css';

export type UnitRole = 'hero' | 'enemy' | 'ally';

export type RoleBlockTop = { kind: 'initiative'; value: number } | { kind: 'none' };

export interface RoleBlockProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'onClick'> {
  unitRole: UnitRole;
  top: RoleBlockTop | null;
  label?: string;
  active?: boolean;
  editable?: boolean;
  mine?: boolean;
  dead?: boolean;
  disabled?: boolean;
  fill?: boolean;
  tile?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

function formatValue(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : String(value);
}

export function RoleBlock({
  unitRole,
  top,
  label,
  active = false,
  editable = false,
  mine = false,
  dead = false,
  disabled = false,
  fill = false,
  tile = false,
  onClick,
  className,
  ...rest
}: RoleBlockProps) {
  const { t } = useTranslation('RoleBlock');
  const shownLabel = label ?? t(unitRole);
  const content = (
    <>
      {top === null ? (
        <span className={classes.die} role="img" aria-label={t('noInitiative')}>
          <IconDiceD20 size={iconSizes.M} aria-hidden="true" />
        </span>
      ) : top.kind === 'initiative' ? (
        <span className={classes.value} data-editable={editable || undefined}>
          {formatValue(top.value)}
        </span>
      ) : null}
      <span className={classes.label}>{shownLabel}</span>
      {mine ? <span className={classes.chip}>{t('you')}</span> : null}
    </>
  );
  const shared = {
    className: className ? `${classes.root} ${className}` : classes.root,
    'data-unit-role': unitRole,
    'data-active': active || undefined,
    'data-inactive': dead || disabled || undefined,
    'data-fill': fill || undefined,
    'data-tile': tile || undefined,
  };
  if (!onClick) {
    return (
      <div {...rest} {...shared}>
        {content}
      </div>
    );
  }
  return (
    <UnstyledButton {...rest} {...shared} component="button" type="button" onClick={onClick}>
      {content}
    </UnstyledButton>
  );
}
