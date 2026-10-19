import type { HpHistoryEntry, HpHistoryKind } from '@combat-planner/domain';
import type { CSSProperties, HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { Chip } from '../../atoms/Chip/Chip.tsx';
import classes from './HistoryRow.module.css';

export type HistoryRowProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  maxHp: number;
} & ({ entry: HpHistoryEntry; hp?: never } | { entry: null; hp: number });

const historyKindColors: Record<HpHistoryKind, { fill: string; text: string; amount: string }> = {
  damage: {
    fill: 'var(--cp-condition-vulnerable-fill)',
    text: 'var(--cp-condition-vulnerable-text)',
    amount: 'var(--cp-hp-damage)',
  },
  heal: {
    fill: 'var(--cp-condition-confused-fill)',
    text: 'var(--cp-condition-confused-text)',
    amount: 'var(--cp-hp-heal)',
  },
  temp: {
    fill: 'var(--cp-history-temp-fill)',
    text: 'var(--cp-history-temp-text)',
    amount: 'var(--cp-history-temp-text)',
  },
  max: {
    fill: 'var(--cp-condition-fear-fill)',
    text: 'var(--cp-condition-fear-text)',
    amount: 'var(--cp-color-ink)',
  },
};

const wideWhenLocales = new Set(['es', 'ja', 'ru']);

const signed = (value: number) => (value < 0 ? `−${Math.abs(value)}` : String(value));

export function HistoryRow({ entry, hp, maxHp, className, style, ...rest }: HistoryRowProps) {
  const { t, i18n } = useTranslation('HistoryRow');
  const result = entry ? entry.result : hp;
  const resultMax = entry ? (entry.max ?? (entry.kind === 'max' ? entry.amount : maxHp)) : maxHp;
  const when =
    entry === null || entry.round === null ? t('start') : t('round', { round: entry.round });
  const amountText = (() => {
    if (!entry) return null;
    switch (entry.kind) {
      case 'damage':
        return entry.absorbed > 0
          ? `−${entry.amount} ${t('absorbed', { amount: entry.absorbed })}`
          : `−${entry.amount}`;
      case 'heal':
        return `+${entry.amount}`;
      case 'temp':
        return t('tempAmount', { amount: entry.amount });
      case 'max':
        return `${entry.previous} → ${entry.amount}`;
    }
  })();
  const colors = entry ? historyKindColors[entry.kind] : null;
  return (
    <div
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      style={colors ? ({ '--history-amount': colors.amount, ...style } as CSSProperties) : style}
      data-kind={entry?.kind}
      data-wide-when={wideWhenLocales.has(i18n.resolvedLanguage ?? '') || undefined}
    >
      <span className={classes.when}>{when}</span>
      <span className={classes.change}>
        {entry && colors ? (
          <Chip
            variant="meta"
            size="S"
            className={classes.kind}
            data-part="kind"
            style={{ '--chip-fill': colors.fill, '--chip-text': colors.text } as CSSProperties}
          >
            {t(entry.kind)}
          </Chip>
        ) : null}
        {amountText ? (
          <span className={classes.amount} data-part="amount">
            {amountText}
          </span>
        ) : null}
      </span>
      <span className={classes.result} data-part="result">
        {signed(result)}/{resultMax}
      </span>
    </div>
  );
}
