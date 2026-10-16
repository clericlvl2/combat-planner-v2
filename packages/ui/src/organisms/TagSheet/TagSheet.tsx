import { LIMITS } from '@combat-planner/domain';
import { useState } from 'react';
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

export interface TagSheetProps {
  opened: boolean;
  mode: TagSheetMode;
  tags: readonly TagSheetTag[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  onCreate?: (name: string) => void;
  onDone: () => void;
  onClose: () => void;
  presetName?: string;
  presetCount?: number;
  maxLength?: number;
}

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
}: TagSheetProps) {
  const { t } = useTranslation('TagSheet');
  const [query, setQuery] = useState('');
  const filter = mode === 'filter';
  const needle = normalize(query);
  const hasMatch = needle === '' || tags.some((tag) => normalize(tag.name).includes(needle));
  const create =
    !filter && !hasMatch && onCreate
      ? (name: string) => {
          onCreate(name);
          setQuery('');
        }
      : undefined;

  const title = filter
    ? t('filterTitle')
    : presetName
      ? t('assignTitle', { name: presetName })
      : t('tags');

  const doneLabel = filter
    ? value.length > 0 && presetCount !== undefined
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
        <Button variant="primary" fullWidth onClick={onDone}>
          {doneLabel}
        </Button>
      }
    >
      <SearchField
        value={query}
        onChange={(next) => setQuery(next.slice(0, maxLength))}
        placeholder={filter ? t('searchTags') : t('searchOrCreate')}
      />
      <CheckList
        aria-label={title}
        options={tags.map((tag) => ({ value: tag.id, label: tag.name, count: tag.count }))}
        values={value}
        onChange={onChange}
        query={query}
        onCreate={create}
      />
    </Sheet>
  );
}
