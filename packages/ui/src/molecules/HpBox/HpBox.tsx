import { healthSegments, healthStatus } from '@combat-planner/domain';
import type { HealthStatus } from '@combat-planner/domain';
import { UnstyledButton } from '@mantine/core';
import type { HTMLAttributes, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './HpBox.module.css';

export type HpBoxViewer = 'dm' | 'player';

export type HpBoxHealth =
  | { hp: number; maxHp: number; tempHp?: number; status?: never }
  | { status: HealthStatus; hp?: never; maxHp?: never; tempHp?: never };

export type HpBoxProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'onClick'> &
  HpBoxHealth & {
    viewer: HpBoxViewer;
    mine?: boolean;
    disabled?: boolean;
    onClick?: MouseEventHandler<HTMLButtonElement>;
  };

const segmentSlots = [0, 1, 2, 3] as const;

function formatHp(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : String(value);
}

export function HpBox({
  hp,
  maxHp,
  tempHp = 0,
  status: statusProp,
  viewer,
  mine = false,
  disabled = false,
  onClick,
  className,
  ...rest
}: HpBoxProps) {
  const { t } = useTranslation('HpBox');
  const numbers = hp !== undefined && maxHp !== undefined ? { hp, maxHp } : null;
  const status = numbers ? healthStatus(numbers.hp, numbers.maxHp) : (statusProp ?? 'full');
  const segments = healthSegments(status, numbers?.hp, numbers?.maxHp);
  const dm = viewer === 'dm';
  const off = status === 'dead' || disabled;
  const showStatus = !dm || status !== 'full';
  const content = (
    <>
      {numbers ? (
        <span
          className={classes.numbers}
          data-part="numbers"
          data-mine={(mine && !off) || undefined}
        >
          <span className={classes.current}>{formatHp(numbers.hp)}</span>
          <span className={classes.max}>/{numbers.maxHp}</span>
        </span>
      ) : null}
      {dm ? (
        <span className={classes.segments} aria-hidden="true">
          {segmentSlots.map((slot) => (
            <span
              key={slot}
              className={classes.segment}
              data-segment=""
              data-filled={slot < segments || undefined}
            />
          ))}
        </span>
      ) : null}
      {showStatus ? (
        <span className={classes.status} data-part="status">
          {t(status)}
        </span>
      ) : null}
      {tempHp > 0 ? <span className={classes.temp}>{t('temp', { amount: tempHp })}</span> : null}
    </>
  );
  const shared = {
    className: className ? `${classes.root} ${className}` : classes.root,
    'data-viewer': viewer,
    'data-status': status,
    'data-segments': dm ? segments : undefined,
    'data-off': off || undefined,
  };
  if (!onClick) {
    return (
      <div {...rest} {...shared}>
        {content}
      </div>
    );
  }
  return (
    <UnstyledButton {...rest} {...shared} component="button" type="button" onClick={onClick}>
      {content}
    </UnstyledButton>
  );
}
