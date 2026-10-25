import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';
import { EscalationDie } from '../../atoms/EscalationDie/EscalationDie.tsx';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import classes from './PlayerHeader.module.css';

export interface PlayerHeaderProps extends Omit<
  ComponentPropsWithoutRef<'header'>,
  'children' | 'title'
> {
  title: string;
  round: number | null;
  escalation: EscalationValue;
  statusBar?: boolean;
}

export function PlayerHeader({
  title,
  round,
  escalation,
  statusBar = true,
  className,
  ...rest
}: PlayerHeaderProps) {
  const { t } = useTranslation('PlayerHeader');
  const setup = round === null;
  return (
    <header {...rest} className={className ? `${classes.root} ${className}` : classes.root}>
      {statusBar ? <div className={classes.statusBar} aria-hidden="true" /> : null}
      <div className={classes.body}>
        <span className={classes.title} data-ellipsis="">
          {title}
        </span>
        <h1 className={classes.main}>{setup ? t('setup') : t('round', { round })}</h1>
        {setup ? null : <EscalationDie className={classes.die} value={escalation} readOnly />}
      </div>
    </header>
  );
}
