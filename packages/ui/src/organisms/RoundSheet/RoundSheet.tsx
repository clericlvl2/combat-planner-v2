import { LIMITS } from '@combat-planner/domain';
import { UnstyledButton } from '@mantine/core';
import { useId } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { EscalationDie } from '../../atoms/EscalationDie/EscalationDie.tsx';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import { Stepper } from '../../molecules/Stepper/Stepper.tsx';
import { Sheet } from '../Sheet/Sheet.tsx';
import rows from '../Sheet/SheetRows.module.css';
import classes from './RoundSheet.module.css';

export interface RoundSheetProps {
  opened: boolean;
  combatTitle: string;
  round: number;
  escalation: EscalationValue;
  onRoundChange: (round: number) => void;
  onEscalationChange: (value: EscalationValue) => void;
  onClose: () => void;
}

const escalationValues = Array.from(
  { length: LIMITS.escalation.max - LIMITS.escalation.min + 1 },
  (_, index) => (LIMITS.escalation.min + index) as EscalationValue,
);

interface FacePickerProps {
  value: EscalationValue;
  onPick: (value: EscalationValue) => void;
}

function FacePicker({ value, onPick }: FacePickerProps) {
  const { t } = useTranslation('CombatHeader');
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-face]')];
    const current = keys.findIndex((node) => node === document.activeElement);
    if (current < 0) return;
    const last = keys.length - 1;
    let next: number;
    if (event.key === 'ArrowRight') next = current === last ? 0 : current + 1;
    else if (event.key === 'ArrowLeft') next = current === 0 ? last : current - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    keys[next]?.focus();
  };
  return (
    <div className={classes.faces} onKeyDown={handleKeyDown}>
      {escalationValues.map((face) => {
        const selected = face === value;
        return (
          <UnstyledButton
            key={face}
            component="button"
            type="button"
            className={classes.face}
            data-face={face}
            data-selected={selected || undefined}
            aria-pressed={selected}
            aria-label={t('escalationFace', { value: face })}
            onClick={() => onPick(face)}
          >
            <EscalationDie className={classes.faceDie} value={face} readOnly aria-hidden="true" />
          </UnstyledButton>
        );
      })}
    </div>
  );
}

export function RoundSheet({
  opened,
  combatTitle,
  round,
  escalation,
  onRoundChange,
  onEscalationChange,
  onClose,
}: RoundSheetProps) {
  const { t } = useTranslation('CombatHeader');
  const roundLabel = useId();
  const escalationLabel = useId();
  return (
    <Sheet opened={opened} title={t('roundSheetTitle')} subtitle={combatTitle} onClose={onClose}>
      <div className={rows.rows}>
        <div className={rows.row} role="group" aria-labelledby={roundLabel}>
          <span id={roundLabel} className={rows.label}>
            {t('round')}
          </span>
          <Stepper
            value={round}
            min={LIMITS.round.min}
            max={LIMITS.round.max}
            signed={false}
            size="M"
            onChange={onRoundChange}
          />
        </div>
        <div className={rows.row} role="group" aria-labelledby={escalationLabel}>
          <span id={escalationLabel} className={rows.label}>
            {t('escalationTitle')}
          </span>
          <FacePicker value={escalation} onPick={onEscalationChange} />
        </div>
      </div>
    </Sheet>
  );
}
