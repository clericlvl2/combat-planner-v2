import type { Icon } from '@tabler/icons-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { Button } from '../../atoms/Button/Button.tsx';
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
}

export function MessageScreen({
  icon: IconComponent,
  title,
  body,
  actionLabel,
  actionVariant = 'secondary',
  onAction,
  className,
  ...rest
}: MessageScreenProps) {
  return (
    <div
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      data-system-screen=""
    >
      <span className={classes.tile} aria-hidden="true">
        <IconComponent size={32} stroke={2} />
      </span>
      <h1 className={classes.title}>{title}</h1>
      <p className={classes.body}>{body}</p>
      {actionLabel !== undefined && onAction !== undefined ? (
        <div className={classes.action}>
          <Button variant={actionVariant} size="M" onClick={() => onAction()}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
