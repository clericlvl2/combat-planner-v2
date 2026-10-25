import { UnstyledButton } from '@mantine/core';
import type { ReactNode } from 'react';
import classes from './TurnStrip.module.css';

export type TurnStripKind = 'next' | 'turn';

export interface TurnStripProps {
  kind: TurnStripKind;
  children: ReactNode;
  onClick: () => void;
}

export function TurnStrip({ kind, children, onClick }: TurnStripProps) {
  return (
    <div className={classes.root}>
      <UnstyledButton
        key={kind}
        component="button"
        type="button"
        className={classes.strip}
        data-kind={kind}
        onClick={onClick}
      >
        <span className={classes.label} data-ellipsis="">
          {children}
        </span>
      </UnstyledButton>
    </div>
  );
}
