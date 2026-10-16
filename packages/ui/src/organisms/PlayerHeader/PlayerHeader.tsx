import { UnstyledButton } from '@mantine/core';
import { IconDots, IconUsers } from '@tabler/icons-react';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';
import { EscalationDie } from '../../atoms/EscalationDie/EscalationDie.tsx';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import { Menu } from '../Menu/Menu.tsx';
import classes from './PlayerHeader.module.css';

export type PlayerHeaderMenuItem = 'heroes';

export interface PlayerHeaderProps extends Omit<
  ComponentPropsWithoutRef<'header'>,
  'children' | 'title'
> {
  title: string;
  round: number | null;
  escalation: EscalationValue;
  onMenu?: () => void;
  menuOpened?: boolean;
  onMenuClose?: () => void;
  onHeroes?: () => void;
}

const MENU_WIDTH = 240;

export function PlayerHeader({
  title,
  round,
  escalation,
  onMenu,
  menuOpened = false,
  onMenuClose,
  onHeroes,
  className,
  ...rest
}: PlayerHeaderProps) {
  const { t } = useTranslation('PlayerHeader');
  const setup = round === null;
  return (
    <header {...rest} className={className ? `${classes.root} ${className}` : classes.root}>
      <div className={classes.statusBar} aria-hidden="true" />
      <div className={classes.body}>
        <div className={classes.text}>
          <span className={classes.title}>{title}</span>
          <h1 className={classes.main}>{setup ? t('setup') : t('round', { round })}</h1>
        </div>
        {setup ? null : <EscalationDie value={escalation} readOnly />}
        {onMenu ? (
          <Menu
            opened={menuOpened}
            width={MENU_WIDTH}
            aria-label={t('menuLabel')}
            items={[{ id: 'heroes', icon: IconUsers, label: t('heroes') }]}
            onSelect={() => onHeroes?.()}
            onClose={() => onMenuClose?.()}
            target={
              <UnstyledButton
                component="button"
                type="button"
                className={classes.menu}
                aria-haspopup="menu"
                aria-expanded={menuOpened}
                onClick={() => onMenu()}
              >
                <span className={classes.tile} aria-hidden="true">
                  <IconDots size={24} stroke={2} />
                </span>
                <span className={classes.caption}>{t('menu')}</span>
              </UnstyledButton>
            }
          />
        ) : null}
      </div>
    </header>
  );
}
