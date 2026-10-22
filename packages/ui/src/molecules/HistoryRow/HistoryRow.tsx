import type { HpHistoryEntry, HpHistoryKind } from '@combat-planner/domain';
import type { HTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './HistoryRow.module.css';

export type HistoryRowProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  maxHp: number;
} & ({ entry: HpHistoryEntry; hp?: never } | { entry: null; hp: number });

const signed = (value: number) => (value < 0 ? `−${Math.abs(value)}` : String(value));

const amountText = (kind: HpHistoryKind, amount: number) => {
  switch (kind) {
    case 'damage':
      return `−${amount}`;
    case 'heal':
    case 'temp':
      return `+${amount}`;
    case 'max':
      return String(amount);
  }
};

export function HistoryRow({ entry, hp, maxHp, className, ...rest }: HistoryRowProps) {
  const { t } = useTranslation('HistoryRow');
  const result = entry ? entry.result : hp;
  const resultMax = entry ? (entry.max ?? (entry.kind === 'max' ? entry.amount : maxHp)) : maxHp;
  const when =
    entry === null || entry.round === null ? t('start') : t('round', { round: entry.round });
  return (
    <div
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      data-kind={entry?.kind}
    >
      <span className={classes.amount} data-part="amount">
        {entry ? amountText(entry.kind, entry.amount) : null}
      </span>
      <span className={classes.change}>
        {entry ? (
          <span className={classes.kind} data-part="kind">
            {t(entry.kind)}
          </span>
        ) : null}
        <span className={classes.when} data-part="when">
          {when}
          {entry && entry.kind === 'damage' && entry.absorbed > 0 ? (
            <span data-part="absorbed"> {t('absorbed', { amount: entry.absorbed })}</span>
          ) : null}
        </span>
      </span>
      <span className={classes.result} data-part="result">
        {signed(result)}/{resultMax}
      </span>
    </div>
  );
}
