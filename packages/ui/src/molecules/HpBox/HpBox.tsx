import { healthStatus } from '@combat-planner/domain';
import type { HealthStatus, Role } from '@combat-planner/domain';
import { UnstyledButton, VisuallyHidden } from '@mantine/core';
import { IconZzz } from '@tabler/icons-react';
import type { HTMLAttributes, MouseEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './HpBox.module.css';

export type HpBoxViewer = 'dm' | 'player';

export type HpBoxHealth =
  | { hp: number; maxHp: number; role: Role; tempHp?: number; status?: never; preset?: never }
  | {
      status: HealthStatus;
      hp?: never;
      maxHp?: never;
      role?: never;
      tempHp?: never;
      preset?: never;
    }
  | { preset: true; maxHp: number; hp?: never; role?: never; tempHp?: never; status?: never };

export type HpBoxProps = Omit<HTMLAttributes<HTMLElement>, 'children' | 'onClick'> &
  HpBoxHealth & {
    viewer: HpBoxViewer;
    mine?: boolean;
    disabled?: boolean;
    onClick?: MouseEventHandler<HTMLButtonElement>;
  };

const pipSlots = [0, 1] as const;

const pipsOf: Record<HealthStatus, number> = {
  full: 2,
  wounded: 1,
  staggered: 1,
  unconscious: 0,
  dead: 0,
};

function formatHp(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : String(value);
}

export function HpBox({
  hp,
  maxHp,
  role,
  tempHp = 0,
  status: statusProp,
  preset,
  viewer,
  mine = false,
  disabled = false,
  onClick,
  className,
  ...rest
}: HpBoxProps) {
  const { t } = useTranslation('HpBox');
  const numbers =
    !preset && hp !== undefined && maxHp !== undefined && role !== undefined
      ? { hp, maxHp, role }
      : null;
  const status = numbers
    ? healthStatus(numbers.hp, numbers.maxHp, numbers.role)
    : (statusProp ?? 'full');
  const pips = pipsOf[status];
  const dm = viewer === 'dm';
  const off = !preset && (status === 'dead' || disabled);
  const button = Boolean(onClick && numbers);
  const editable = Boolean(numbers) && !off && (mine || button);
  const showStatus = !preset && (!dm || status !== 'full');
  const content = preset ? (
    <span className={classes.numbers} data-part="numbers">
      <span className={classes.current}>{maxHp}</span>
      <span className={classes.max}>{t('hp')}</span>
    </span>
  ) : (
    <>
      {numbers ? (
        <span className={classes.numbers} data-part="numbers" data-editable={editable || undefined}>
          <span className={classes.current}>{formatHp(numbers.hp)}</span>
          <span className={classes.max}>/{numbers.maxHp}</span>
        </span>
      ) : null}
      <span className={classes.pips} aria-hidden="true">
        {pipSlots.map((slot) => (
          <span
            key={slot}
            className={classes.pip}
            data-pip=""
            data-filled={slot < pips || undefined}
          />
        ))}
      </span>
      {status === 'unconscious' ? (
        <span
          className={`${classes.badge} ${classes.sleep}`}
          data-part="unconscious"
          aria-hidden="true"
        >
          <IconZzz size={11} stroke={2.5} />
        </span>
      ) : null}
      {showStatus ? <VisuallyHidden data-part="status">{t(status)}</VisuallyHidden> : null}
      {tempHp > 0 ? (
        <>
          <span
            className={`${classes.badge} ${classes.temp}`}
            data-part="temp-badge"
            aria-hidden="true"
          >
            +{tempHp}
          </span>
          <VisuallyHidden data-part="temp">{t('temp', { amount: tempHp })}</VisuallyHidden>
        </>
      ) : null}
    </>
  );
  const shared = {
    className: className ? `${classes.root} ${className}` : classes.root,
    'data-viewer': viewer,
    'data-status': preset ? undefined : status,
    'data-pips': preset ? undefined : pips,
    'data-preset': preset,
    'data-off': off || undefined,
  };
  if (!button) {
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
