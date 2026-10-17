import { LIMITS } from '@combat-planner/domain';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../atoms/Button/Button.tsx';
import type { CombatColor } from '../../../atoms/Swatch/Swatch.tsx';
import { TextArea } from '../../../atoms/TextArea/TextArea.tsx';
import { TextField } from '../../../atoms/TextField/TextField.tsx';
import { SwatchRow } from '../../../molecules/SwatchRow/SwatchRow.tsx';
import { Sheet } from '../../../organisms/Sheet/Sheet.tsx';
import classes from './CombatFormSheet.module.css';

export type CombatFormMode = 'create' | 'edit';

export interface CombatFormValue {
  title: string;
  description: string;
  color: CombatColor;
}

export const DEFAULT_COMBAT_COLOR: CombatColor = 7;

export const emptyCombatForm: CombatFormValue = {
  title: '',
  description: '',
  color: DEFAULT_COMBAT_COLOR,
};

export interface CombatFormSheetProps {
  mode: CombatFormMode;
  value: CombatFormValue;
  onSubmit: (value: CombatFormValue) => void;
  onClose: () => void;
  opened: boolean;
  pending?: boolean;
}

export function CombatFormSheet({
  mode,
  value,
  onSubmit,
  onClose,
  opened,
  pending = false,
}: CombatFormSheetProps) {
  const { t } = useTranslation('CombatFormSheet');
  const [title, setTitle] = useState(value.title);
  const [description, setDescription] = useState(value.description);
  const [color, setColor] = useState<CombatColor>(value.color);
  const [touched, setTouched] = useState(false);
  const trimmed = title.trim();
  const valid =
    trimmed.length > 0 &&
    title.length <= LIMITS.combatTitle &&
    description.length <= LIMITS.combatDescription;

  return (
    <Sheet
      opened={opened}
      title={mode === 'create' ? t('newCombat') : t('editCombat')}
      onClose={onClose}
      actions={
        <Button
          variant="primary"
          fullWidth
          disabled={!valid || pending}
          onClick={() => onSubmit({ title: trimmed, description: description.trim(), color })}
        >
          {mode === 'create' ? t('create') : t('save')}
        </Button>
      }
    >
      <TextField
        label={t('title')}
        value={title}
        placeholder={t('titlePlaceholder')}
        maxLength={LIMITS.combatTitle}
        required
        error={touched && trimmed.length === 0 ? t('titleRequired') : undefined}
        onChange={setTitle}
        onBlur={() => setTouched(true)}
      />
      <TextArea
        label={t('description')}
        value={description}
        placeholder={t('descriptionPlaceholder')}
        maxLength={LIMITS.combatDescription}
        onChange={setDescription}
      />
      <div className={classes.color}>
        <span className={classes.colorLabel} aria-hidden="true">
          {t('color')}
        </span>
        <SwatchRow aria-label={t('color')} value={color} onChange={setColor} />
      </div>
    </Sheet>
  );
}
