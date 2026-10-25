import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { HpChange } from '../../hooks/useHpChanges.ts';
import { layout } from '../../layout.ts';
import classes from './HpChangeOverlay.module.css';

export interface HpChangeOverlayProps {
  change: HpChange;
  showNumber: boolean;
  reduced: boolean;
}

function useNumberText(change: HpChange): string | null {
  const { t } = useTranslation('HpBox');
  if (change.kind === undefined || change.amount === undefined) return null;
  if (change.kind === 'damage') return `−${change.amount}`;
  if (change.kind === 'heal') return `+${change.amount}`;
  return t('temp', { amount: change.amount });
}

function Badge({ change, text }: { change: HpChange; text: string }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShown(false), layout.hpNumberMs);
    return () => clearTimeout(timer);
  }, []);
  if (!shown) return null;
  return (
    <span className={classes.badge} data-kind={change.kind} data-hp-change="badge">
      {text}
    </span>
  );
}

function Ribbon({ status, label }: { status: string; label: string }) {
  const style = { '--cp-ribbon-chars': Array.from(label).length } as CSSProperties;
  return (
    <span className={classes.ribbon} data-status={status} data-hp-change="ribbon" style={style}>
      <span data-hp-change="ribbon-label">{label}</span>
    </span>
  );
}

export function HpChangeOverlay({ change, showNumber, reduced }: HpChangeOverlayProps) {
  const { t } = useTranslation('HpBox');
  const numberText = useNumberText(change);
  const text = showNumber ? numberText : null;
  if (reduced) return text === null ? null : <Badge change={change} text={text} />;
  if (text === null && change.status === undefined) return null;
  return (
    <span className={classes.overlay} aria-hidden="true">
      {text === null ? null : (
        <span className={classes.number} data-kind={change.kind} data-hp-change="number">
          {text}
        </span>
      )}
      {change.status === undefined ? null : (
        <Ribbon status={change.status} label={t(change.status)} />
      )}
    </span>
  );
}
