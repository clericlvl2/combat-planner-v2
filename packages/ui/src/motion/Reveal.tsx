import { useEffect, useState } from 'react';
import type { ReactNode, TransitionEvent } from 'react';
import { useHpMotionReduced } from '../hooks/useHpChanges.ts';
import { layout } from '../layout.ts';
import classes from './Reveal.module.css';

export type RevealPhase = 'opening' | 'open' | 'closing' | 'closed';

export interface RevealProps {
  open: boolean;
  className?: string;
  children: ReactNode;
}

const SETTLE_SLACK_MS = 100;

const settled = (open: boolean): RevealPhase => (open ? 'open' : 'closed');

export function Reveal({ open, className, children }: RevealProps) {
  const instant = useHpMotionReduced();
  const [phase, setPhase] = useState<RevealPhase>(settled(open));
  const [wasOpen, setWasOpen] = useState(open);
  let next = phase;
  if (open !== wasOpen) {
    next = open ? 'opening' : 'closing';
    setWasOpen(open);
    setPhase(next);
  }
  const shown = instant ? settled(open) : next;
  const moving = shown === 'opening' || shown === 'closing';

  useEffect(() => {
    if (!moving) return;
    const timer = window.setTimeout(
      () => setPhase(settled(open)),
      layout.cardExpandMs + SETTLE_SLACK_MS,
    );
    return () => window.clearTimeout(timer);
  }, [moving, open]);

  if (shown === 'closed') return null;

  const settle = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'grid-template-rows') return;
    setPhase(settled(open));
  };

  return (
    <div
      className={className ? `${classes.root} ${className}` : classes.root}
      data-reveal={shown}
      inert={shown === 'closing' || undefined}
      onTransitionEnd={settle}
    >
      <div className={classes.inner}>{children}</div>
    </div>
  );
}
