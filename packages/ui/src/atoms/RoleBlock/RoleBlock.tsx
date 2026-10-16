import { UnstyledButton } from '@mantine/core';
import { IconDice5 } from '@tabler/icons-react';
import type { HTMLAttributes, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './RoleBlock.module.css';

export type UnitRole = 'hero' | 'enemy' | 'ally';

export type RoleBlockTop = { kind: 'initiative'; value: number } | { kind: 'hp'; value: number };

export interface RoleBlockProps extends Omit<HTMLAttributes<HTMLElement>, 'children' | 'onClick'> {
  unitRole: UnitRole;
  top: RoleBlockTop | null;
  label?: string;
  active?: boolean;
  editable?: boolean;
  mine?: boolean;
  dead?: boolean;
  disabled?: boolean;
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
  onClick,
  className,
  ...rest
}: RoleBlockProps) {
  const { t } = useTranslation('RoleBlock');
  const shownLabel = label ?? (top?.kind === 'hp' ? t('hp') : t(unitRole));
  const content = (
    <>
      {active ? <span className={classes.notch} data-notch="" aria-hidden="true" /> : null}
      {top ? (
        <span className={classes.value} data-editable={editable || undefined}>
          {formatValue(top.value)}
        </span>
      ) : (
        <span className={classes.die} role="img" aria-label={t('noInitiative')}>
          <IconDice5 size={20} stroke={2} aria-hidden="true" />
        </span>
      )}
      <span className={classes.label}>{shownLabel}</span>
      {mine ? <span className={classes.chip}>{t('you')}</span> : null}
    </>
  );
  const shared = {
    className: className ? `${classes.root} ${className}` : classes.root,
    'data-unit-role': unitRole,
    'data-active': active || undefined,
    'data-inactive': dead || disabled || undefined,
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
