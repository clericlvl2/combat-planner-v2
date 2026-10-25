import type { Icon } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import classes from './EmptyState.module.css';

export interface EmptyStateProps {
  icon: Icon;
  title: ReactNode;
  body: ReactNode;
}

export function EmptyState({ icon: IconComponent, title, body }: EmptyStateProps) {
  return (
    <div className={classes.root}>
      <span className={classes.tile} aria-hidden="true">
        <IconComponent size={32} stroke={2} />
      </span>
      <h2 className={classes.title}>{title}</h2>
      <p className={classes.body}>{body}</p>
    </div>
  );
}
