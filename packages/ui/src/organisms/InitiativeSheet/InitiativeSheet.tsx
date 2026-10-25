import { LIMITS, rolledInitiative } from '@combat-planner/domain';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { IconDiceD20 } from '../../atoms/icons/IconDiceD20.ts';
import { Stepper } from '../../molecules/Stepper/Stepper.tsx';
import { Sheet } from '../Sheet/Sheet.tsx';

export interface InitiativeSheetProps {
  opened: boolean;
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
  value,
  bonus,
  onSet,
  onRoll,
  onClose,
  random = Math.random,
}: InitiativeSheetProps) {
  const { t } = useTranslation('InitiativeSheet');

  const title = t('title');

  const roll = () => {
    const face = rollD20(random);
    onRoll(rolledInitiative(face, bonus), face);
  };

  return (
    <Sheet
      opened={opened}
      title={title}
      header={null}
      onClose={onClose}
      actions={
        <Button variant="primary" fullWidth icon={IconDiceD20} onClick={roll} data-sheet-action="">
          {t('roll', { bonus: signed(bonus) })}
        </Button>
      }
    >
      <Stepper
        label={title}
        value={value}
        min={LIMITS.initiative.min}
        max={LIMITS.initiative.max}
        signed={false}
        onChange={onSet}
      />
    </Sheet>
  );
}
