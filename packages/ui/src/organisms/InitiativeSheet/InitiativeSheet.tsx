import { LIMITS, rolledInitiative } from '@combat-planner/domain';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { IconDiceD20 } from '../../atoms/icons/IconDiceD20.ts';
import { Stepper } from '../../molecules/Stepper/Stepper.tsx';
import { Sheet } from '../Sheet/Sheet.tsx';
import classes from './InitiativeSheet.module.css';

export interface InitiativeSheetProps {
  opened: boolean;
  unitName: string;
  value: number | null;
  bonus: number;
  onSet: (value: number) => void;
  onRoll: (initiative: number, roll: number) => void;
  onClose: () => void;
  random?: () => number;
}

const MINUS = '−';

function signed(value: number): string {
  return value < 0 ? `${MINUS}${Math.abs(value)}` : `+${value}`;
}

function rollD20(random: () => number): number {
  const { min, max } = LIMITS.roll;
  return Math.min(max, min + Math.floor(random() * (max - min + 1)));
}

export function InitiativeSheet({
  opened,
  unitName,
  value,
  bonus,
  onSet,
  onRoll,
  onClose,
  random = Math.random,
}: InitiativeSheetProps) {
  const { t } = useTranslation('InitiativeSheet');

  const roll = () => {
    const face = rollD20(random);
    onRoll(rolledInitiative(face, bonus), face);
  };

  return (
    <Sheet
      opened={opened}
      title={t('title')}
      subtitle={unitName}
      onClose={onClose}
      actions={
        <Button variant="primary" fullWidth icon={IconDiceD20} data-sheet-action="" onClick={roll}>
          {t('roll', { bonus: signed(bonus) })}
        </Button>
      }
    >
      <div className={classes.steps}>
        <Stepper
          value={value}
          min={LIMITS.initiative.min}
          max={LIMITS.initiative.max}
          signed={false}
          size="M"
          onChange={onSet}
        />
      </div>
    </Sheet>
  );
}
