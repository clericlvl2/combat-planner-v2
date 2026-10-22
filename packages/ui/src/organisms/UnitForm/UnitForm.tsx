import { LIMITS, ROLES } from '@combat-planner/domain';
import type { IntRange, Preset, Role, UnitForm as UnitFormFields } from '@combat-planner/domain';
import { UnstyledButton } from '@mantine/core';
import { IconCheck, IconTags } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { Chip } from '../../atoms/Chip/Chip.tsx';
import { SearchField } from '../../atoms/SearchField/SearchField.tsx';
import { TextArea } from '../../atoms/TextArea/TextArea.tsx';
import { TextField } from '../../atoms/TextField/TextField.tsx';
import { ToolButton } from '../../atoms/ToolButton/ToolButton.tsx';
import { Segmented } from '../../molecules/Segmented/Segmented.tsx';
import { Stepper } from '../../molecules/Stepper/Stepper.tsx';
import { Sheet } from '../Sheet/Sheet.tsx';
import { TagSheet } from '../TagSheet/TagSheet.tsx';
import type { TagSheetTag } from '../TagSheet/TagSheet.tsx';
import classes from './UnitForm.module.css';

export type UnitDraft = UnitFormFields;

export type UnitFormMode = 'add' | 'edit';

export type UnitFormSource = 'new' | 'library';

export type UnitFormHint = 'setup' | 'active';

export interface UnitFormProps {
  opened: boolean;
  mode: UnitFormMode;
  value?: Partial<UnitDraft>;
  onSubmit: (draft: UnitDraft) => void;
  onCancel: () => void;
  lockRole?: boolean;
  lockMaxHp?: boolean;
  presets?: readonly Preset[];
  tags?: readonly TagSheetTag[];
  combatTitle?: string;
  unitNames?: readonly string[];
  hint?: UnitFormHint;
}

type NumberKey = 'maxHp' | 'tempHp' | 'ac' | 'pd' | 'md' | 'initiativeBonus';

interface NumberField {
  key: NumberKey;
  range: IntRange;
  fallback: number;
}

const numberFields: readonly NumberField[] = [
  { key: 'maxHp', range: LIMITS.maxHp, fallback: 10 },
  { key: 'tempHp', range: LIMITS.tempHp, fallback: LIMITS.tempHp.min },
  { key: 'ac', range: LIMITS.defense, fallback: 10 },
  { key: 'pd', range: LIMITS.defense, fallback: 10 },
  { key: 'md', range: LIMITS.defense, fallback: 10 },
  { key: 'initiativeBonus', range: LIMITS.initiativeBonus, fallback: 0 },
];

const defaultRole: Role = 'enemy';

function draftOf(value: Partial<UnitDraft> | undefined): UnitDraft {
  const numbers = Object.fromEntries(
    numberFields.map((field) => [field.key, value?.[field.key] ?? field.fallback]),
  ) as Record<NumberKey, number>;
  return {
    ...numbers,
    name: value?.name ?? '',
    role: value?.role ?? defaultRole,
    note: value?.note ?? '',
  };
}

function setKeysOf(value: Partial<UnitDraft> | undefined): ReadonlySet<NumberKey> {
  return new Set(
    numberFields.filter((field) => value?.[field.key] !== undefined).map((f) => f.key),
  );
}

const allNumberKeys: ReadonlySet<NumberKey> = new Set(numberFields.map((field) => field.key));

const fold = (text: string) => text.toLocaleLowerCase();

const signedBonus = (value: number) => (value < 0 ? `−${Math.abs(value)}` : `+${value}`);

function matchesTags(preset: Preset, tagIds: readonly string[]): boolean {
  return tagIds.length === 0 || preset.tags.some((tag) => tagIds.includes(tag));
}

export function UnitForm({
  opened,
  mode,
  value,
  onSubmit,
  onCancel,
  lockRole = false,
  lockMaxHp = false,
  presets,
  tags = [],
  combatTitle,
  unitNames = [],
  hint,
}: UnitFormProps) {
  const { t } = useTranslation('UnitForm');
  const [wasOpened, setWasOpened] = useState(opened);
  const [draft, setDraft] = useState<UnitDraft>(() => draftOf(value));
  const [setKeys, setSetKeys] = useState<ReadonlySet<NumberKey>>(() => setKeysOf(value));
  const [source, setSource] = useState<UnitFormSource>('new');
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [sheetTags, setSheetTags] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  if (opened !== wasOpened) {
    setWasOpened(opened);
    if (opened) {
      setDraft(draftOf(value));
      setSetKeys(setKeysOf(value));
      setSource('new');
      setQuery('');
      setTagFilter([]);
      setSheetTags(null);
      setPicked(null);
    }
  }

  const adding = mode === 'add';
  const withLibrary = adding && presets !== undefined;
  const library = withLibrary && source === 'library';
  const roleLabel = (role: Role) => t(role);
  const taken = new Set(unitNames);
  let n = 1;
  while (taken.has(t('defaultName', { role: roleLabel(draft.role), n }))) n += 1;
  const fallbackName = adding
    ? t('defaultName', { role: roleLabel(draft.role), n })
    : (value?.name ?? '');

  const needle = fold(query.trim());
  const listed = (presets ?? []).filter(
    (preset) =>
      (needle === '' || fold(preset.name).includes(needle)) && matchesTags(preset, tagFilter),
  );
  const pickedPreset = presets?.find((preset) => preset.id === picked);
  const tagName = (id: string) => tags.find((tag) => tag.id === id)?.name ?? id;

  const update = <K extends keyof UnitDraft>(key: K, next: UnitDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: next }));
  };

  const updateNumber = (key: NumberKey, next: number) => {
    update(key, next);
    setSetKeys((current) => new Set([...current, key]));
  };

  const withPreset = (current: UnitDraft, preset: Preset): UnitDraft => ({
    ...current,
    name: preset.name,
    role: lockRole ? current.role : preset.role,
    maxHp: lockMaxHp ? current.maxHp : preset.maxHp,
    ac: preset.ac,
    pd: preset.pd,
    md: preset.md,
    initiativeBonus: preset.initiativeBonus,
  });

  const pick = (preset: Preset) => {
    setPicked(preset.id);
    setDraft((current) => withPreset(current, preset));
    setSetKeys(allNumberKeys);
  };

  const changeSource = (next: UnitFormSource) => {
    setSource(next);
    setPicked(null);
  };

  const changeQuery = (next: string) => {
    setQuery(next);
    setPicked(null);
  };

  const changeTagFilter = (next: string[]) => {
    setTagFilter(next);
    setPicked(null);
  };

  const submit = () => {
    if (library) {
      if (pickedPreset) onSubmit(withPreset(draft, pickedPreset));
      return;
    }
    onSubmit({ ...draft, name: draft.name.trim() || fallbackName });
  };

  const emptyText =
    needle !== '' && tagFilter.length > 0
      ? t('noMatchQueryTags', { query: query.trim(), tags: tagFilter.map(tagName).join(', ') })
      : needle !== ''
        ? t('noMatchQuery', { query: query.trim() })
        : tagFilter.length > 0
          ? t('noMatchTags', { tags: tagFilter.map(tagName).join(', ') })
          : t('noPresets');

  const ctaLabel = !adding
    ? t('saveChanges')
    : library
      ? pickedPreset
        ? t('addPreset', { name: pickedPreset.name })
        : t('pickPreset')
      : t('addUnit');

  const sheetValue = sheetTags ?? tagFilter;
  const sheetCount = (presets ?? []).filter((preset) => matchesTags(preset, sheetValue)).length;

  return (
    <>
      <Sheet
        opened={opened}
        title={adding ? t('addTitle') : t('editTitle')}
        subtitle={adding ? combatTitle : (value?.name ?? draft.name)}
        onClose={onCancel}
        actions={
          <Button
            className={classes.submit}
            variant="primary"
            fullWidth
            disabled={library && !pickedPreset}
            onClick={submit}
            data-sheet-action=""
          >
            {ctaLabel}
          </Button>
        }
      >
        {withLibrary ? (
          <Segmented
            className={classes.tabs}
            aria-label={t('source')}
            options={[
              { value: 'new', label: t('new') },
              { value: 'library', label: t('library') },
            ]}
            value={source}
            onChange={changeSource}
          />
        ) : null}
        {library ? (
          <>
            <div className={classes.tools}>
              <SearchField
                className={classes.search}
                value={query}
                onChange={changeQuery}
                placeholder={t('searchPresets')}
              />
              <ToolButton
                icon={IconTags}
                label={t('tags')}
                count={tagFilter.length > 0 ? tagFilter.length : undefined}
                active={tagFilter.length > 0}
                aria-haspopup="dialog"
                onClick={() => setSheetTags(tagFilter)}
              />
            </div>
            {tagFilter.length > 0 ? (
              <div className={classes.chips}>
                {tagFilter.map((id) => (
                  <Chip
                    key={id}
                    variant="tag"
                    selected
                    aria-label={t('removeTag', { name: tagName(id) })}
                    onRemove={() => changeTagFilter(tagFilter.filter((tag) => tag !== id))}
                  >
                    {tagName(id)}
                  </Chip>
                ))}
                <Button variant="ghost" size="S" onClick={() => changeTagFilter([])}>
                  {t('clear')}
                </Button>
              </div>
            ) : null}
            <div className={classes.library}>
              {listed.length > 0 ? (
                <div className={classes.list} role="group" aria-label={t('presets')}>
                  {listed.map((preset) => {
                    const on = preset.id === picked;
                    return (
                      <UnstyledButton
                        key={preset.id}
                        component="button"
                        type="button"
                        className={classes.preset}
                        aria-pressed={on}
                        data-selected={on || undefined}
                        onClick={() => pick(preset)}
                      >
                        <span className={classes.badge} data-role={preset.role}>
                          {roleLabel(preset.role)}
                        </span>
                        <span className={classes.presetText}>
                          <span className={classes.presetName}>{preset.name}</span>
                          <span className={classes.presetStats}>
                            {t('presetStats', {
                              hp: preset.maxHp,
                              ac: preset.ac,
                              pd: preset.pd,
                              md: preset.md,
                            })}
                          </span>
                        </span>
                        {on ? (
                          <IconCheck
                            className={classes.check}
                            size={20}
                            stroke={2}
                            aria-hidden="true"
                          />
                        ) : null}
                      </UnstyledButton>
                    );
                  })}
                </div>
              ) : (
                <div className={classes.empty} role="status">
                  <span className={classes.emptyTitle}>{t('nothingFound')}</span>
                  <span className={classes.emptyBody}>{emptyText}</span>
                </div>
              )}
              {listed.length > 4 ? <span className={classes.fade} aria-hidden="true" /> : null}
            </div>
          </>
        ) : (
          <>
            <TextField
              className={draft.name === '' ? classes.name : `${classes.name} ${classes.named}`}
              label={t('name')}
              value={draft.name}
              placeholder={fallbackName}
              maxLength={LIMITS.unitName}
              onChange={(next) => update('name', next)}
            />
            <div className={classes.field}>
              <span className={classes.caption} aria-hidden="true">
                {t('type')}
              </span>
              <Segmented
                className={classes.roles}
                aria-label={t('type')}
                tone="role"
                disabled={lockRole}
                options={ROLES.map((role) => ({ value: role, label: roleLabel(role) }))}
                value={draft.role}
                onChange={(next) => update('role', next)}
              />
            </div>
            <div className={classes.steppers}>
              {numberFields.map((field) => (
                <Stepper
                  key={field.key}
                  className={classes.stepper}
                  data-empty={setKeys.has(field.key) ? undefined : ''}
                  label={t(field.key)}
                  min={field.range.min}
                  max={field.range.max}
                  value={draft[field.key]}
                  disabled={lockMaxHp && field.key === 'maxHp'}
                  onChange={(next) => updateNumber(field.key, next)}
                />
              ))}
            </div>
            {adding && hint ? (
              <span className={classes.hint}>
                {hint === 'setup'
                  ? t('hintSetup')
                  : t('hintActive', { bonus: signedBonus(draft.initiativeBonus) })}
              </span>
            ) : null}
            <TextArea
              label={t('note')}
              value={draft.note}
              placeholder={t('optional')}
              maxLength={LIMITS.note}
              rows={2}
              onChange={(next) => update('note', next)}
            />
          </>
        )}
      </Sheet>
      {library ? (
        <TagSheet
          opened={sheetTags !== null}
          mode="filter"
          tags={tags}
          value={sheetValue}
          presetCount={sheetCount}
          onChange={setSheetTags}
          onDone={() => {
            changeTagFilter(sheetValue);
            setSheetTags(null);
          }}
          onClose={() => setSheetTags(null)}
        />
      ) : null}
    </>
  );
}
