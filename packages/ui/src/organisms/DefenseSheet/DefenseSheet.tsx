import { LIMITS } from '@combat-planner/domain';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { defenseTotal, modDirection } from '../../molecules/DefenseLine/DefenseLine.tsx';
import type { DefenseStat } from '../../molecules/DefenseLine/DefenseLine.tsx';
import { Stepper } from '../../molecules/Stepper/Stepper.tsx';
import { Sheet } from '../Sheet/Sheet.tsx';
import classes from './DefenseSheet.module.css';

export interface DefenseMods {
  ac: number;
  pd: number;
  md: number;
}

export interface DefenseSheetProps {
  opened: boolean;
  unitName: string;
  base: DefenseMods;
  mods: DefenseMods;
  onChange: (mods: DefenseMods) => void;
  onClose: () => void;
}

const STATS = ['ac', 'pd', 'md'] as const satisfies readonly DefenseStat[];

const NO_MODS: DefenseMods = { ac: 0, pd: 0, md: 0 };

function DefenseRow({
  stat,
  base,
  mod,
  onChange,
}: {
  stat: DefenseStat;
  base: number;
  mod: number;
  onChange: (mod: number) => void;
}) {
  const { t } = useTranslation('DefenseSheet');
  const { t: tLine } = useTranslation('DefenseLine');
  const label = tLine(stat);
  return (
    <div className={classes.stat} data-stat={stat} role="group" aria-label={label}>
      <Stepper
        label={label}
        value={mod}
        onChange={onChange}
        min={LIMITS.defenseMod.min}
        max={LIMITS.defenseMod.max}
        signed
      />
      <div className={classes.reading}>
        <span className={classes.total} data-mod={modDirection(mod)}>
          {defenseTotal(base, mod)}
        </span>
        <span className={classes.base}>{t('base', { value: base })}</span>
      </div>
    </div>
  );
}

export function DefenseSheet({
  opened,
  unitName,
  base,
  mods,
  onChange,
  onClose,
}: DefenseSheetProps) {
  const { t } = useTranslation('DefenseSheet');
  const title = t('title', { name: unitName });
  const untouched = STATS.every((stat) => mods[stat] === 0);
  return (
    <Sheet
      opened={opened}
      title={title}
      onClose={onClose}
      header={
        <>
          <h2 className={classes.title} data-ellipsis="">
            {title}
          </h2>
          <Button
            className={classes.reset}
            variant="ghost"
            size="S"
            disabled={untouched}
            onClick={() => onChange(NO_MODS)}
          >
            {t('reset')}
          </Button>
        </>
      }
    >
      <div className={classes.stats}>
        {STATS.map((stat) => (
          <DefenseRow
            key={stat}
            stat={stat}
            base={base[stat]}
            mod={mods[stat]}
            onChange={(mod) => onChange({ ...mods, [stat]: mod })}
          />
        ))}
      </div>
    </Sheet>
  );
}
