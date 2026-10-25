import { Loader, UnstyledButton } from '@mantine/core';
import {
  IconArrowBackUp,
  IconChevronLeft,
  IconDots,
  IconFileExport,
  IconLanguage,
  IconLogout,
  IconRefresh,
  IconShare,
  IconSwitchHorizontal,
  IconTrash,
  IconUserPlus,
} from '@tabler/icons-react';
import type { ComponentPropsWithoutRef } from 'react';
import { useTranslation } from 'react-i18next';
import { EscalationDie } from '../../atoms/EscalationDie/EscalationDie.tsx';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import { useDelayed } from '../../hooks/useDelayed.ts';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import { Menu } from '../Menu/Menu.tsx';
import type { MenuItem } from '../Menu/Menu.tsx';
import { iconSizes } from '../../theme.ts';
import classes from './CombatHeader.module.css';

export type CombatHeaderPanel = 'round' | 'menu';

export type CombatMenuAction = 'addUnit' | 'undo' | 'share' | 'export' | 'restart' | 'clear';

export type CombatHeaderViewer = 'dm' | 'player';

export interface CombatHeaderProps extends Omit<
  ComponentPropsWithoutRef<'header'>,
  'children' | 'title'
> {
  title: string;
  round: number | null;
  escalation: EscalationValue;
  viewer?: CombatHeaderViewer;
  open?: CombatHeaderPanel | null;
  statusBar?: boolean;
  onBack?: () => void;
  onRound?: () => void;
  onMenu: () => void;
  onClose: () => void;
  onMenuSelect?: (action: CombatMenuAction) => void;
  onHeroes?: () => void;
  onLanguage?: () => void;
  languageName?: string;
  onLeave?: () => void;
  undoDisabled?: boolean;
  busy?: boolean;
}

const MENU_WIDTH = 240;

export function CombatHeader({
  title,
  round,
  escalation,
  viewer = 'dm',
  open = null,
  statusBar = true,
  onBack,
  onRound,
  onMenu,
  onClose,
  onMenuSelect,
  onHeroes,
  onLanguage,
  languageName,
  onLeave,
  undoDisabled = false,
  busy = false,
  className,
  ...rest
}: CombatHeaderProps) {
  const { t } = useTranslation('CombatHeader');
  const setup = round === null;
  const player = viewer === 'player';
  const editRound = player ? undefined : onRound;
  const roundOpen = !setup && open === 'round';
  const menuOpen = open === 'menu';
  const spinning = useDelayed(busy);

  const items: MenuItem[] = player
    ? [
        { id: 'heroes', icon: IconSwitchHorizontal, label: t('heroes') },
        ...(onLanguage
          ? [{ id: 'language', icon: IconLanguage, label: t('language'), hint: languageName }]
          : []),
        { id: 'leave', icon: IconLogout, label: t('leave'), tone: 'danger', divider: true },
      ]
    : [
        { id: 'addUnit', icon: IconUserPlus, label: t('addUnit') },
        { id: 'undo', icon: IconArrowBackUp, label: t('undo'), disabled: undoDisabled },
        { id: 'share', icon: IconShare, label: t('share') },
        { id: 'export', icon: IconFileExport, label: t('export') },
        ...(setup
          ? []
          : [{ id: 'restart', icon: IconRefresh, label: t('restart'), divider: true }]),
        { id: 'clear', icon: IconTrash, label: t('clear'), tone: 'danger', divider: setup },
      ];

  const selectItem = (id: string) => {
    if (player && id === 'leave') onLeave?.();
    else if (player && id === 'language') onLanguage?.();
    else if (player) onHeroes?.();
    else onMenuSelect?.(id as CombatMenuAction);
  };

  const roundContent = (
    <>
      <span className={classes.caption}>{t('round')}</span>{' '}
      <span className={classes.number}>{round}</span>
    </>
  );

  const escalationContent = (
    <>
      <EscalationDie className={classes.ticketDie} value={escalation} readOnly aria-hidden="true" />
      <span className={classes.stack}>
        <span className={classes.caption}>{t('escalationCaption')}</span>{' '}
        <span className={classes.number}>+{escalation}</span>
      </span>
    </>
  );

  const ticketContent = (
    <>
      <span className={classes.roundCell}>{roundContent}</span>
      <span className={classes.divider} aria-hidden="true" />
      <span className={classes.escalationCell}>{escalationContent}</span>
    </>
  );

  const ticket = setup ? (
    <div className={classes.ticket} data-setup="">
      <div className={classes.setup}>{t('setup')}</div>
    </div>
  ) : editRound ? (
    <UnstyledButton
      component="button"
      type="button"
      className={classes.ticket}
      aria-label={t('editRoundAndEscalation', { round, value: escalation })}
      aria-haspopup="dialog"
      aria-expanded={roundOpen}
      data-open={roundOpen || undefined}
      onClick={() => editRound()}
    >
      {ticketContent}
    </UnstyledButton>
  ) : (
    <div className={classes.ticket}>{ticketContent}</div>
  );

  return (
    <header {...rest} className={className ? `${classes.root} ${className}` : classes.root}>
      {statusBar ? <div className={classes.statusBar} aria-hidden="true" /> : null}
      <div className={classes.bar}>
        {onBack ? (
          <IconButton
            className={classes.back}
            variant="plain"
            icon={IconChevronLeft}
            aria-label={t('back')}
            onClick={() => onBack()}
          />
        ) : null}
        <h1 className={classes.title} data-ellipsis="">
          {title}
        </h1>
        <Menu
          opened={menuOpen}
          width={MENU_WIDTH}
          aria-label={player ? t('playerMenuLabel') : t('menuLabel')}
          items={items}
          onSelect={selectItem}
          onClose={() => onClose()}
          target={
            <UnstyledButton
              component="button"
              type="button"
              className={classes.menu}
              data-tour="menu"
              aria-label={t('menu')}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-busy={spinning || undefined}
              disabled={spinning}
              onClick={busy ? undefined : () => onMenu()}
            >
              {spinning ? (
                <Loader size={iconSizes.L} color="currentColor" />
              ) : (
                <IconDots size={iconSizes.L} stroke={2} aria-hidden="true" />
              )}
            </UnstyledButton>
          }
        />
      </div>
      {ticket}
    </header>
  );
}
