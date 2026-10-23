import type { Preset } from '@combat-planner/domain';
import { UnstyledButton } from '@mantine/core';
import { IconCopy, IconTrash } from '@tabler/icons-react';
import { useId } from 'react';
import type { ComponentPropsWithoutRef, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleBlock } from '../../atoms/RoleBlock/RoleBlock.tsx';
import { CardActions } from '../../molecules/CardActions/CardActions.tsx';
import { DefenseLine } from '../../molecules/DefenseLine/DefenseLine.tsx';
import { HpBox } from '../../molecules/HpBox/HpBox.tsx';
import { Menu } from '../Menu/Menu.tsx';
import type { MenuItem } from '../Menu/Menu.tsx';
import classes from './PresetCard.module.css';

export type PresetCardPreset = Pick<Preset, 'name' | 'role' | 'maxHp' | 'ac' | 'pd' | 'md'>;

export type PresetCardMenuItem = 'duplicate' | 'delete';

export interface PresetCardProps extends Omit<ComponentPropsWithoutRef<'article'>, 'children'> {
  preset: PresetCardPreset;
  tags: readonly string[];
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onMore: () => void;
  menuOpened?: boolean;
  busy?: boolean;
  duplicateDisabled?: boolean;
  onMenuClose?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

const MENU_WIDTH = 240;

const TAG_SEPARATOR = ' · ';

const INTERACTIVE =
  'button, a, input, textarea, select, [role="button"], [role="dialog"], [role="menu"], [data-part="actions"]';

export function PresetCard({
  preset,
  tags,
  expanded,
  onToggle,
  onEdit,
  onMore,
  menuOpened = false,
  busy = false,
  duplicateDisabled = false,
  onMenuClose,
  onDuplicate,
  onDelete,
  className,
  onClick,
  ...rest
}: PresetCardProps) {
  const { t } = useTranslation('PresetCard');
  const actionsId = useId();
  const menuOpen = expanded && menuOpened;
  const items: MenuItem[] = [
    { id: 'duplicate', icon: IconCopy, label: t('duplicate'), disabled: duplicateDisabled },
    { id: 'delete', icon: IconTrash, label: t('delete'), tone: 'danger', divider: true },
  ];

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
    onToggle();
  };

  return (
    <article
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      data-expanded={expanded || undefined}
      onClick={handleClick}
    >
      <RoleBlock className={classes.role} fill tile unitRole={preset.role} top={{ kind: 'none' }} />
      <div className={classes.main}>
        <span className={classes.name} data-part="name">
          {preset.name}
        </span>
        <DefenseLine ac={preset.ac} pd={preset.pd} md={preset.md} />
        <span
          className={classes.tags}
          data-tag-line
          data-ellipsis=""
          data-empty={tags.length === 0 || undefined}
        >
          {tags.length > 0 ? tags.join(TAG_SEPARATOR) : t('noTags')}
        </span>
      </div>
      <UnstyledButton
        component="button"
        type="button"
        className={classes.toggle}
        aria-label={preset.name}
        aria-expanded={expanded}
        aria-controls={expanded ? actionsId : undefined}
        onClick={() => onToggle()}
      />
      <div className={classes.hp}>
        <HpBox viewer="dm" preset maxHp={preset.maxHp} />
      </div>
      {expanded ? (
        <div id={actionsId} className={classes.actions} data-part="actions">
          <Menu
            opened={menuOpen}
            width={MENU_WIDTH}
            aria-label={t('menuLabel')}
            items={items}
            onSelect={(id) => {
              if (id === 'duplicate') onDuplicate?.();
              if (id === 'delete') onDelete?.();
            }}
            onClose={() => onMenuClose?.()}
            target={
              <CardActions
                className={classes.cardActions}
                open={menuOpen}
                busy={busy}
                onEdit={onEdit}
                onMore={() => onMore()}
              />
            }
          />
        </div>
      ) : null}
    </article>
  );
}
