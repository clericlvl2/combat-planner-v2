import { UnstyledButton } from '@mantine/core';
import type { HTMLAttributes, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './EscalationDie.module.css';

export type EscalationValue = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface EscalationDieProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'onClick'
> {
  value: EscalationValue;
  readOnly?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}

const pipSlots: Record<EscalationValue, readonly number[]> = {
  0: [],
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const slots = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

export function EscalationDie({
  value,
  readOnly = false,
  onClick,
  className,
  ...rest
}: EscalationDieProps) {
  const { t } = useTranslation('EscalationDie');
  const filled = pipSlots[value];
  const caption = value === 0 ? t('none') : t('value', { value });
  const content = (
    <>
      <span className={classes.tile} data-tile="" aria-hidden="true">
        {slots.map((slot) => (
          <span key={slot} className={classes.slot}>
            {filled.includes(slot) ? <span className={classes.pip} data-pip="" /> : null}
          </span>
        ))}
      </span>
      <span className={classes.caption}>{caption}</span>
    </>
  );
  const rootClass = className ? `${classes.root} ${className}` : classes.root;
  const empty = value === 0 || undefined;
  if (readOnly || !onClick) {
    return (
      <div {...rest} className={rootClass} data-value={value} data-empty={empty}>
        {content}
      </div>
    );
  }
  return (
    <UnstyledButton
      {...rest}
      component="button"
      type="button"
      className={rootClass}
      data-value={value}
      data-empty={empty}
      onClick={onClick}
    >
      {content}
    </UnstyledButton>
  );
}
