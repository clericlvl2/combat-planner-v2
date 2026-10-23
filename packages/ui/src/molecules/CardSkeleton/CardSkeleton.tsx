import { Skeleton } from '@mantine/core';
import classes from './CardSkeleton.module.css';

export type CardSkeletonVariant = 'combat' | 'preset' | 'unit';

export interface CardSkeletonProps {
  variant: CardSkeletonVariant;
  count?: number;
}

export function CardSkeleton({ variant, count = 1 }: CardSkeletonProps) {
  return (
    <div className={classes.root} data-variant={variant} aria-hidden="true" data-card-skeleton="">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={classes.card}>
          {variant === 'combat' ? <Skeleton className={classes.dot} /> : null}
          <div className={classes.lines}>
            <Skeleton className={classes.title} />
            <Skeleton className={classes.meta} />
          </div>
          {variant === 'combat' ? null : <Skeleton className={classes.value} />}
        </div>
      ))}
    </div>
  );
}
