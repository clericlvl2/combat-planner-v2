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
  now?: number;
}

export function CombatFormSheet({
  mode,
  value,
  onSubmit,
  onClose,
  opened,
  pending = false,
  now = Date.now(),
}: CombatFormSheetProps) {
  const { t, i18n } = useTranslation('CombatFormSheet');
  const [title, setTitle] = useState(value.title);
  const [description, setDescription] = useState(value.description);
  const [color, setColor] = useState<CombatColor>(value.color);
  const fallback =
    mode === 'create'
      ? t('defaultTitle', {
          date: new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(
            now,
          ),
        })
      : value.title;

  return (
    <Sheet
      opened={opened}
      title={mode === 'create' ? t('newCombat') : t('editCombat')}
      onClose={onClose}
      actions={
        <Button
          data-sheet-action=""
          variant="primary"
          fullWidth
          loading={pending}
          onClick={() =>
            onSubmit({ title: title.trim() || fallback, description: description.trim(), color })
          }
        >
          {mode === 'create' ? t('create') : t('save')}
        </Button>
      }
    >
      <TextField
        label={t('title')}
        value={title}
        placeholder={fallback}
        maxLength={LIMITS.combatTitle}
        onChange={setTitle}
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
