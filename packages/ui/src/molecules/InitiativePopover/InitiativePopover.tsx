import { LIMITS, rolledInitiative } from '@combat-planner/domain';
import { Popover } from '@mantine/core';
import { IconDice5 } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { Stepper } from '../Stepper/Stepper.tsx';
import classes from './InitiativePopover.module.css';

export interface InitiativePopoverProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onChange'
> {
  value: number | null;
  bonus: number;
  onSet: (value: number) => void;
  onRoll: (initiative: number, roll: number) => void;
  random?: () => number;
  open: boolean;
  onClose: () => void;
  anchor?: ReactNode;
}

const MINUS = '−';

function signed(value: number): string {
  return value < 0 ? `${MINUS}${Math.abs(value)}` : `+${value}`;
}

function rollD20(random: () => number): number {
  const { min, max } = LIMITS.roll;
  return Math.min(max, min + Math.floor(random() * (max - min + 1)));
}

export function InitiativePopover({
  value,
  bonus,
  onSet,
  onRoll,
  random = Math.random,
  open,
  onClose,
  anchor,
  className,
  ...rest
}: InitiativePopoverProps) {
  const { t } = useTranslation('InitiativePopover');
  const inline = anchor === undefined;
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || !inline) return;
    const handlePointerDown = (event: PointerEvent) => {
      const panelNode = panelRef.current;
      if (panelNode && event.target instanceof Node && !panelNode.contains(event.target)) {
        onCloseRef.current();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, inline]);
  const title = t('title');

  const handleRoll = () => {
    const roll = rollD20(random);
    onRoll(rolledInitiative(roll, bonus), roll);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!inline || event.key !== 'Escape') return;
    event.preventDefault();
    onClose();
  };

  const panel = (
    <div
      {...rest}
      ref={inline ? panelRef : undefined}
      role="dialog"
      aria-label={title}
      className={className ? `${classes.panel} ${className}` : classes.panel}
      onKeyDown={handleKeyDown}
    >
      <span className={classes.title}>
        {title} <span className={classes.bonus}>({signed(bonus)})</span>
      </span>
      <div className={classes.steps} data-empty={value === null || undefined}>
        <Stepper
          className={classes.stepper}
          value={value ?? 0}
          min={LIMITS.initiative.min}
          max={LIMITS.initiative.max}
          size="M"
          onChange={onSet}
        />
        {value === null ? (
          <span className={classes.dash} aria-hidden="true">
            —
          </span>
        ) : null}
      </div>
      <Button size="S" fullWidth icon={IconDice5} onClick={handleRoll}>
        {t('roll', { bonus: signed(bonus) })}
      </Button>
    </div>
  );

  if (inline) return open ? panel : null;

  return (
    <Popover opened={open} onDismiss={onClose} position="bottom-start" offset={8} withRoles={false}>
      <Popover.Target>
        <span className={classes.anchor}>{anchor}</span>
      </Popover.Target>
      <Popover.Dropdown className={classes.dropdown}>{panel}</Popover.Dropdown>
    </Popover>
  );
}
