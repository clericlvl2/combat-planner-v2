import { CONDITIONS } from '@combat-planner/domain';
import type { Condition } from '@combat-planner/domain';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { Checkbox } from '../../atoms/Checkbox/Checkbox.tsx';
import { Chip } from '../../atoms/Chip/Chip.tsx';
import { Sheet } from '../Sheet/Sheet.tsx';
import classes from './ConditionPicker.module.css';

export interface ConditionPickerProps {
  opened: boolean;
  unitName: string;
  value: readonly Condition[];
  onChange: (value: Condition[]) => void;
  onClose: () => void;
}

const gridStyle = {
  '--condition-rows': Math.ceil(CONDITIONS.length / 2),
} as CSSProperties;

export function ConditionPicker({
  opened,
  unitName,
  value,
  onChange,
  onClose,
}: ConditionPickerProps) {
  const { t, i18n } = useTranslation('ConditionPicker');
  const collator = new Intl.Collator(i18n.language);
  const rows = CONDITIONS.map((condition) => ({ condition, label: t(condition) })).sort((a, b) =>
    collator.compare(a.label, b.label),
  );
  const selected = new Set(value);

  const toggle = (condition: Condition, checked: boolean) => {
    onChange(CONDITIONS.filter((item) => (item === condition ? checked : selected.has(item))));
  };

  return (
    <Sheet
      opened={opened}
      title={t('title')}
      subtitle={unitName}
      onClose={onClose}
      actions={
        <Button variant="primary" fullWidth onClick={onClose} data-sheet-action="">
          {t('done')}
        </Button>
      }
    >
      <div className={classes.picker}>
        <div className={classes.grid} style={gridStyle} role="group" aria-label={t('title')}>
          {rows.map(({ condition, label }) => (
            <Checkbox
              key={condition}
              className={classes.row}
              data-condition={condition}
              shape="round"
              condition={condition}
              checked={selected.has(condition)}
              onChange={(checked) => toggle(condition, checked)}
              label={<Chip condition={condition}>{label}</Chip>}
            />
          ))}
        </div>
      </div>
    </Sheet>
  );
}
