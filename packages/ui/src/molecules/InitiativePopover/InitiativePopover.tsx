import { LIMITS, rolledInitiative } from '@combat-planner/domain';
import { Popover } from '@mantine/core';
import { IconDice5 } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import type { HTMLAttributes, KeyboardEvent, ReactNode, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { PopoverFrame } from '../../organisms/Menu/Menu.tsx';
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
  triggerRef?: RefObject<HTMLElement | null>;
}

const MINUS = '−';

const PANEL_WIDTH = 240;

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
  triggerRef,
  className,
  onKeyDown,
  ...rest
}: InitiativePopoverProps) {
  const { t } = useTranslation('InitiativePopover');
  const inline = anchor === undefined;
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const triggerRefRef = useRef(triggerRef);
  triggerRefRef.current = triggerRef;

  useEffect(() => {
    if (!open || !inline) return;
    const handlePointerDown = (event: PointerEvent) => {
      const panelNode = panelRef.current;
      if (!panelNode || !(event.target instanceof Node)) return;
      if (panelNode.contains(event.target)) return;
      if (triggerRefRef.current?.current?.contains(event.target)) return;
      onCloseRef.current();
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
    onKeyDown?.(event);
    if (event.defaultPrevented || !inline || event.key !== 'Escape') return;
    event.preventDefault();
    onClose();
  };

  const panel = (
    <div ref={inline ? panelRef : undefined} className={classes.host}>
      <PopoverFrame
        {...rest}
        role="dialog"
        aria-label={title}
        width={PANEL_WIDTH}
        className={className}
        onKeyDown={handleKeyDown}
      >
        <span className={classes.title}>
          {title} <span className={classes.bonus}>({signed(bonus)})</span>
        </span>
        <div className={classes.steps}>
          <Stepper
            className={classes.stepper}
            value={value}
            signed={false}
            min={LIMITS.initiative.min}
            max={LIMITS.initiative.max}
            size="M"
            onChange={onSet}
          />
        </div>
        <Button size="S" fullWidth icon={IconDice5} onClick={handleRoll}>
          {t('roll', { bonus: signed(bonus) })}
        </Button>
      </PopoverFrame>
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
