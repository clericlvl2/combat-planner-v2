import { LIMITS, ROLES } from '@combat-planner/domain';
import type { IntRange, Role } from '@combat-planner/domain';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../atoms/Button/Button.tsx';
import { Chip } from '../../../atoms/Chip/Chip.tsx';
import { TextField } from '../../../atoms/TextField/TextField.tsx';
import { Segmented } from '../../../molecules/Segmented/Segmented.tsx';
import { Stepper } from '../../../molecules/Stepper/Stepper.tsx';
import { Sheet } from '../../../organisms/Sheet/Sheet.tsx';
import { TagSheet } from '../../../organisms/TagSheet/TagSheet.tsx';
import type { TagSheetTag } from '../../../organisms/TagSheet/TagSheet.tsx';
import classes from './PresetFormSheet.module.css';

export type PresetFormMode = 'create' | 'edit';

export interface PresetFormValue {
  name: string;
  role: Role;
  maxHp: number;
  ac: number;
  pd: number;
  md: number;
  initiativeBonus: number;
  tags: string[];
}

type NumberKey = 'maxHp' | 'ac' | 'pd' | 'md' | 'initiativeBonus';

const numberFields: readonly { key: NumberKey; range: IntRange }[] = [
  { key: 'maxHp', range: LIMITS.maxHp },
  { key: 'ac', range: LIMITS.defense },
  { key: 'pd', range: LIMITS.defense },
  { key: 'md', range: LIMITS.defense },
  { key: 'initiativeBonus', range: LIMITS.initiativeBonus },
];

export const emptyPresetForm: PresetFormValue = {
  name: '',
  role: 'enemy',
  maxHp: 10,
  ac: 10,
  pd: 10,
  md: 10,
  initiativeBonus: 0,
  tags: [],
};

export interface PresetFormSheetProps {
  opened: boolean;
  mode: PresetFormMode;
  value: PresetFormValue;
  tags: readonly TagSheetTag[];
  onSubmit: (value: PresetFormValue) => void;
  onCreateTag: (name: string) => TagSheetTag;
  onClose: () => void;
  pending?: boolean;
}

export function PresetFormSheet({
  opened,
  mode,
  value,
  tags,
  onSubmit,
  onCreateTag,
  onClose,
  pending = false,
}: PresetFormSheetProps) {
  const { t } = useTranslation('PresetFormSheet');
  const [draft, setDraft] = useState<PresetFormValue>(value);
  const [sheetTags, setSheetTags] = useState<string[] | null>(null);
  const [created, setCreated] = useState<readonly TagSheetTag[]>([]);
  const trimmed = draft.name.trim();
  const fallbackName =
    mode === 'create' ? t('namePlaceholder', { role: t(draft.role) }) : value.name;

  const known = [...tags, ...created.filter((tag) => !tags.some((item) => item.id === tag.id))];
  const tagName = (id: string) => known.find((tag) => tag.id === id)?.name ?? id;
  const picked = sheetTags ?? draft.tags;
  const createdIds = new Set(created.map((tag) => tag.id));
  const options = known.filter(
    (tag) => (tag.count ?? 0) > 0 || picked.includes(tag.id) || createdIds.has(tag.id),
  );

  const update = <K extends keyof PresetFormValue>(key: K, next: PresetFormValue[K]) => {
    setDraft((current) => ({ ...current, [key]: next }));
  };

  const createTag = (name: string): boolean => {
    const tag = onCreateTag(name);
    const reused = known.some((item) => item.id === tag.id);
    setCreated((current) => [...current.filter((item) => item.id !== tag.id), tag]);
    setSheetTags((current) => {
      const base = current ?? draft.tags;
      return base.includes(tag.id) ? base : [...base, tag.id];
    });
    return !reused;
  };

  return (
    <>
      <Sheet
        opened={opened}
        title={mode === 'create' ? t('newPreset') : t('editPreset')}
        onClose={onClose}
        actions={
          <Button
            data-sheet-action=""
            variant="primary"
            fullWidth
            disabled={pending}
            onClick={() => onSubmit({ ...draft, name: trimmed || fallbackName })}
          >
            {mode === 'create' ? t('create') : t('save')}
          </Button>
        }
      >
        <TextField
          label={t('name')}
          value={draft.name}
          placeholder={fallbackName}
          maxLength={LIMITS.unitName}
          onChange={(next) => update('name', next)}
        />
        <Segmented
          className={classes.roles}
          aria-label={t('type')}
          tone="role"
          options={ROLES.map((role) => ({ value: role, label: t(role) }))}
          value={draft.role}
          onChange={(next) => update('role', next)}
        />
        <div className={classes.steppers}>
          {numberFields.map((field) => (
            <Stepper
              key={field.key}
              label={t(field.key)}
              min={field.range.min}
              max={field.range.max}
              value={draft[field.key]}
              onChange={(next) => update(field.key, next)}
            />
          ))}
        </div>
        <div className={classes.tags} role="group" aria-label={t('tags')}>
          <span className={classes.caption} aria-hidden="true">
            {t('tags')}
          </span>
          <div className={classes.chips}>
            {draft.tags.map((id) => (
              <Chip
                key={id}
                variant="tag"
                selected
                aria-label={t('removeTag', { name: tagName(id) })}
                onRemove={() =>
                  update(
                    'tags',
                    draft.tags.filter((tag) => tag !== id),
                  )
                }
              >
                {tagName(id)}
              </Chip>
            ))}
            <Chip variant="add" aria-haspopup="dialog" onClick={() => setSheetTags(draft.tags)}>
              {t('addTag')}
            </Chip>
          </div>
        </div>
      </Sheet>
      <TagSheet
        opened={opened && sheetTags !== null}
        mode="assign"
        presetName={trimmed === '' ? undefined : trimmed}
        tags={options}
        value={picked}
        onChange={setSheetTags}
        onCreate={createTag}
        onDone={() => {
          update('tags', picked);
          setSheetTags(null);
        }}
        onClose={() => setSheetTags(null)}
      />
    </>
  );
}
