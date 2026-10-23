import type { Icon } from '@tabler/icons-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { ScrollList } from '../../molecules/ScrollList/ScrollList.tsx';
import classes from './MessageScreen.module.css';

export interface MessageScreenProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'title'
> {
  icon: Icon;
  title: ReactNode;
  body: ReactNode;
  actionLabel?: string;
  actionVariant?: 'primary' | 'secondary';
  onAction?: () => void;
  onHome?: () => void;
}

export function MessageScreen({
  icon: IconComponent,
  title,
  body,
  actionLabel,
  actionVariant = 'secondary',
  onAction,
  onHome,
  className,
  ...rest
}: MessageScreenProps) {
  const { t } = useTranslation('MessageScreen');
  const withAction = actionLabel !== undefined && onAction !== undefined;
  return (
    <ScrollList
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      contentClassName={classes.content}
      data-system-screen=""
    >
      <span className={classes.tile} aria-hidden="true">
        <IconComponent size={32} stroke={2} />
      </span>
      <h1 className={classes.title}>{title}</h1>
      <p className={classes.body}>{body}</p>
      {withAction || onHome !== undefined ? (
        <div className={classes.actions}>
          {withAction ? (
            <Button variant={actionVariant} size="M" onClick={() => onAction()}>
              {actionLabel}
            </Button>
          ) : null}
          {onHome !== undefined ? (
            <Button variant="secondary" size="M" onClick={() => onHome()}>
              {t('home')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </ScrollList>
  );
}
