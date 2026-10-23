import { IconDots, IconPencil } from '@tabler/icons-react';
import type { ComponentPropsWithoutRef, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import classes from './CardActions.module.css';

export type CardActionsTarget = 'edit' | 'more';

export interface CardActionsProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  onEdit: () => void;
  onMore: (event: MouseEvent<HTMLButtonElement>) => void;
  editLabel?: string;
  moreLabel?: string;
  open?: boolean;
  disabled?: boolean;
  busy?: boolean;
  'data-tap'?: CardActionsTarget;
}

export function CardActions({
  onEdit,
  onMore,
  editLabel,
  moreLabel,
  open = false,
  disabled = false,
  busy = false,
  'data-tap': tap,
  className,
  ...rest
}: CardActionsProps) {
  const { t } = useTranslation('CardActions');
  return (
    <div {...rest} className={className ? `${classes.root} ${className}` : classes.root}>
      <Button
        className={classes.edit}
        variant="secondary"
        size="S"
        icon={IconPencil}
        disabled={disabled}
        data-tap={tap === 'edit' ? '' : undefined}
        onClick={() => onEdit()}
      >
        {editLabel ?? t('edit')}
      </Button>
      <IconButton
        className={classes.more}
        icon={IconDots}
        aria-label={moreLabel ?? t('more')}
        aria-haspopup="menu"
        aria-expanded={open}
        data-open={open || undefined}
        data-tap={tap === 'more' ? '' : undefined}
        disabled={disabled}
        loading={busy}
        onClick={onMore}
      />
    </div>
  );
}
