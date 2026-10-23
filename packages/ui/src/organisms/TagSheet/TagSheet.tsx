import { LIMITS } from '@combat-planner/domain';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { SearchField } from '../../atoms/SearchField/SearchField.tsx';
import { CheckList } from '../../molecules/CheckList/CheckList.tsx';
import { Sheet } from '../Sheet/Sheet.tsx';

export type TagSheetMode = 'filter' | 'assign';

export interface TagSheetTag {
  id: string;
  name: string;
  count?: number;
}

interface TagSheetBaseProps {
  opened: boolean;
  tags: readonly TagSheetTag[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  onCreate?: (name: string) => boolean | void;
  onDone: () => void;
  onClose: () => void;
  presetName?: string;
  maxLength?: number;
  createHint?: string;
}

export type TagSheetProps = TagSheetBaseProps &
  ({ mode: 'filter'; presetCount: number } | { mode: 'assign'; presetCount?: undefined });

const normalize = (text: string) => text.trim().toLocaleLowerCase();

export function TagSheet({
  opened,
  mode,
  tags,
  value,
  onChange,
  onCreate,
  onDone,
  onClose,
  presetName,
  presetCount,
  maxLength = LIMITS.tagName,
  createHint,
}: TagSheetProps) {
  const { t } = useTranslation('TagSheet');
  const [query, setQuery] = useState('');
  const [created, setCreated] = useState<readonly string[]>([]);
  const filter = mode === 'filter';

  useEffect(() => {
    if (opened) return;
    setQuery('');
    setCreated([]);
  }, [opened]);

  const create =
    !filter && onCreate
      ? (name: string) => {
          if (onCreate(name) !== false) setCreated([...created, normalize(name)]);
          setQuery('');
        }
      : undefined;

  const isCreated = (tag: TagSheetTag) => created.includes(normalize(tag.name));
  const options = [...tags.filter(isCreated), ...tags.filter((tag) => !isCreated(tag))].map(
    (tag) => ({
      value: tag.id,
      label: tag.name,
      count: tag.count,
      badge: isCreated(tag) ? t('new') : undefined,
    }),
  );

  const title = filter
    ? t('filterTitle')
    : presetName
      ? t('assignTitle', { name: presetName })
      : t('tags');

  const doneLabel = filter
    ? value.length > 0
      ? t('showPresets', { count: presetCount })
      : t('showAll')
    : value.length > 0
      ? t('doneTags', { count: value.length })
      : t('done');

  return (
    <Sheet
      opened={opened}
      title={title}
      onClose={onClose}
      actions={
        <Button variant="primary" fullWidth onClick={onDone} data-sheet-action="">
          {doneLabel}
        </Button>
      }
    >
      <SearchField
        value={query}
        onChange={setQuery}
        maxLength={maxLength}
        placeholder={filter ? t('searchTags') : t('searchOrCreate')}
      />
      <CheckList
        aria-label={title}
        options={options}
        values={value}
        onChange={onChange}
        query={query}
        onCreate={create}
        createLabel={createHint}
        createDisabled={createHint !== undefined}
      />
    </Sheet>
  );
}
