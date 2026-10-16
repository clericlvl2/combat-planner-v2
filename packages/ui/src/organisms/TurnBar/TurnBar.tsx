import { UnstyledButton } from '@mantine/core';
import type { ComponentPropsWithoutRef, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './TurnBar.module.css';

export type TurnBarMode = 'start' | 'next';

export interface TurnBarProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children' | 'onClick' | 'disabled' | 'type'
> {
  mode: TurnBarMode;
  nextName?: string;
  disabled?: boolean;
  reason?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

export function TurnBar({
  mode,
  nextName,
  disabled = false,
  reason,
  onClick,
  className,
  ...rest
}: TurnBarProps) {
  const { t } = useTranslation('TurnBar');
  const title = mode === 'start' ? t('startCombat') : t('nextTurn');
  const secondary =
    disabled && reason ? reason : mode === 'start' ? t('rollsMissingInitiative') : nextName;
  return (
    <div className={classes.root}>
      <UnstyledButton
        {...rest}
        component="button"
        type="button"
        className={className ? `${classes.button} ${className}` : classes.button}
        data-mode={mode}
        disabled={disabled}
        onClick={onClick}
      >
        <span className={classes.title}>{title}</span>
        {secondary ? <span className={classes.secondary}>{secondary}</span> : null}
      </UnstyledButton>
    </div>
  );
}
