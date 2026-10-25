import type { CombatStatus } from '@combat-planner/domain';
import { UnstyledButton } from '@mantine/core';
import {
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconFileExport,
  IconTrash,
} from '@tabler/icons-react';
import { useId } from 'react';
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Chip } from '../../atoms/Chip/Chip.tsx';
import { CardActions } from '../../molecules/CardActions/CardActions.tsx';
import { Menu } from '../Menu/Menu.tsx';
import type { MenuItem } from '../Menu/Menu.tsx';
import { iconSizes } from '../../theme.ts';
import classes from './CombatCard.module.css';

export type CombatCardAction = 'duplicate' | 'export' | 'delete';

export type CombatCardTarget = 'chevron' | 'edit' | 'more';

export interface CombatCardProps extends Omit<
  ComponentPropsWithoutRef<'article'>,
  'children' | 'title' | 'color'
> {
  title: string;
  description?: string;
  color: number;
  status: CombatStatus;
  round: number | null;
  units: number;
  lastPlayedDays?: number | null;
  expanded: boolean;
  menuOpen?: boolean;
  busy?: boolean;
  duplicateDisabled?: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onEdit: () => void;
  onMore: () => void;
  onMenuClose: () => void;
  onMenuSelect: (action: CombatCardAction) => void;
  'data-tap'?: CombatCardTarget;
}

const MENU_WIDTH = 240;

const DAYS_PER_WEEK = 7;

const WEEKS_FROM_DAYS = 14;

export function CombatCard({
  title,
  description,
  color,
  status,
  round,
  units,
  lastPlayedDays,
  expanded,
  menuOpen = false,
  busy = false,
  duplicateDisabled = false,
  onOpen,
  onToggle,
  onEdit,
  onMore,
  onMenuClose,
  onMenuSelect,
  'data-tap': tap,
  className,
  style,
  ...rest
}: CombatCardProps) {
  const { t } = useTranslation('CombatCard');
  const detailsId = useId();
  const active = status === 'active';
  const lastPlayed =
    lastPlayedDays === undefined
      ? null
      : lastPlayedDays === null
        ? t('neverPlayed')
        : lastPlayedDays === 0
          ? t('today')
          : lastPlayedDays === 1
            ? t('yesterday')
            : lastPlayedDays < WEEKS_FROM_DAYS
              ? t('daysAgo', { count: lastPlayedDays })
              : t('weeksAgo', { count: Math.floor(lastPlayedDays / DAYS_PER_WEEK) });
  const meta = [
    active && round !== null ? t('round', { round }) : null,
    t('units', { count: units }),
    lastPlayed,
  ]
    .filter((part) => part !== null)
    .join(' · ');
  const items: MenuItem[] = [
    { id: 'duplicate', icon: IconCopy, label: t('duplicate'), disabled: duplicateDisabled },
    { id: 'export', icon: IconFileExport, label: t('export') },
    { id: 'delete', icon: IconTrash, label: t('delete'), tone: 'danger', divider: true },
  ];
  const Chevron = expanded ? IconChevronUp : IconChevronDown;
  return (
    <article
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      style={{ ...style, '--combat-color': `var(--cp-combat-${color})` } as CSSProperties}
      data-expanded={expanded || undefined}
    >
      <div className={classes.row}>
        <UnstyledButton
          component="button"
          type="button"
          className={classes.open}
          onClick={() => onOpen()}
        >
          <span className={classes.dot} aria-hidden="true" />
          <span className={classes.text}>
            <span className={classes.title}>{title}</span>
            <span className={classes.meta}>
              <Chip variant="status" selected={active}>
                {active ? t('active') : t('setup')}
              </Chip>
              <span>{meta}</span>
            </span>
          </span>
        </UnstyledButton>
        <UnstyledButton
          component="button"
          type="button"
          className={classes.chevron}
          aria-label={t('details', { title })}
          aria-expanded={expanded}
          aria-controls={expanded ? detailsId : undefined}
          data-tap={tap === 'chevron' ? '' : undefined}
          onClick={() => onToggle()}
        >
          <Chevron size={iconSizes.L} stroke={2} aria-hidden="true" />
        </UnstyledButton>
      </div>
      {expanded ? (
        <div id={detailsId} className={classes.details}>
          {description ? <p className={classes.description}>{description}</p> : null}
          <Menu
            opened={menuOpen}
            width={MENU_WIDTH}
            aria-label={t('menuLabel', { title })}
            items={items}
            onSelect={(id) => onMenuSelect(id as CombatCardAction)}
            onClose={() => onMenuClose()}
            target={
              <CardActions
                open={menuOpen}
                busy={busy}
                data-tap={tap === 'edit' || tap === 'more' ? tap : undefined}
                onEdit={() => onEdit()}
                onMore={() => onMore()}
              />
            }
          />
        </div>
      ) : null}
    </article>
  );
}
