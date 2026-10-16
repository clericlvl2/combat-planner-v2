import type { Icon } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Button } from '../../atoms/Button/Button.tsx';
import classes from './EmptyState.module.css';

export interface EmptyStateAction {
  label: string;
  onAction: () => void;
  icon?: Icon;
  variant?: 'primary' | 'secondary';
}

export interface EmptyStateProps {
  icon: Icon;
  title: ReactNode;
  body: ReactNode;
  action?: EmptyStateAction;
}

export function EmptyState({ icon: IconComponent, title, body, action }: EmptyStateProps) {
  return (
    <div className={classes.root}>
      <span className={classes.tile} aria-hidden="true">
        <IconComponent size={32} stroke={2} />
      </span>
      <h2 className={classes.title}>{title}</h2>
      <p className={classes.body}>{body}</p>
      {action ? (
        <div className={classes.action}>
          <Button
            variant={action.variant ?? 'primary'}
            size="M"
            icon={action.icon}
            onClick={action.onAction}
          >
            {action.label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
