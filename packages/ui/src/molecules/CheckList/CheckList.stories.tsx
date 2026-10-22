import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/CheckList.json';
import { CheckList } from './CheckList.tsx';
import type { CheckListOption, CheckListProps } from './CheckList.tsx';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { anyValue, storyT } from '../../storybook/storyT.ts';

type TagKey = Exclude<keyof typeof en, 'create' | 'noMatch'>;

interface CellOption {
  key?: TagKey;
  label?: string;
  count: number;
  badge?: string;
}

interface CheckListCellProps extends Omit<CheckListProps, 'options'> {
  tags: readonly CellOption[];
  width?: number;
}

function CheckListCell({
  tags,
  values: initialValues,
  onChange,
  width = 300,
  ...props
}: CheckListCellProps) {
  const { t } = useTranslation('CheckList');
  const [values, setValues] = useState(initialValues);
  const options: CheckListOption[] = tags.map((tag) => ({
    value: tag.key ?? tag.label ?? '',
    label: tag.label ?? (tag.key ? t(tag.key) : ''),
    count: tag.count,
    badge: tag.badge,
  }));
  return (
    <div
      style={{
        boxSizing: 'border-box',
        width: width + 24,
        maxWidth: '100%',
        padding: 12,
        background: 'var(--cp-color-surface)',
      }}
    >
      <CheckList
        {...props}
        options={options}
        values={values}
        onChange={(next) => {
          setValues(next);
          onChange(next);
        }}
      />
    </div>
  );
}

const tags: readonly CellOption[] = [
  { key: 'orcs', count: 2 },
  { key: 'ferry', count: 6 },
  { key: 'goblins', count: 3 },
  { key: 'undead', count: 4 },
];

const library: readonly CellOption[] = [...tags, { key: 'mooks', count: 8 }];

const typedLibrary: readonly CellOption[] = [
  { label: 'Orcs', count: 2 },
  { label: 'Ferry', count: 6 },
  { label: 'Goblins', count: 3 },
  { label: 'Undead', count: 4 },
  { label: 'Mooks', count: 8 },
];

const sizeTags: readonly CellOption[] = [
  { key: 'orcs', count: 2 },
  { key: 'goblins', count: 3 },
];

const meta = preview.meta({
  title: 'Molecules/CheckList',
  component: CheckListCell,
  args: { tags, values: ['orcs', 'ferry'], onChange: fn() },
});

export const Default = meta.story({
  tags: ['visual'],
  args: { tags, values: ['orcs', 'ferry'] },
});

export const QueryMatches = meta.story({
  tags: ['visual'],
  args: { tags: typedLibrary, values: [], query: 'mo', onCreate: fn() },
});

export const QueryFiltersRows = meta.story({
  tags: ['!dev'],
  args: { tags: typedLibrary, values: [], query: 'mo', onCreate: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CheckList');
    await expect(canvas.getByText('Mooks')).toBeVisible();
    await expect(canvas.queryByRole('checkbox', { name: `${t('orcs')} 2` })).toBeNull();
    await expect(canvas.queryByRole('button', { name: t('create', { query: 'mo' }) })).toBeNull();
    const rows = canvas.getByRole('group').children;
    await expect(rows).toHaveLength(1);
    await expect(rows[0]).toHaveAttribute('data-active');
    await expect(args.onCreate).not.toHaveBeenCalled();
  },
});

export const NoMatchOffersCreate = meta.story({
  args: { tags: library, values: [], query: 'Elite', onCreate: fn() },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CheckList');
    const create = canvas.getByRole('button', { name: t('create', { query: 'Elite' }) });
    await expect(canvas.getByRole('group').firstElementChild).toBe(create);
    await expect(create).toHaveAttribute('data-active');
    await expect(canvas.getByText(t('noMatch'))).toBeVisible();
    await expect(canvas.queryAllByRole('checkbox')).toHaveLength(0);
  },
});

const sizeColumns = ['Default'] as const;

const sizeRows = (['S', 'M', 'L'] as const).map((size) => ({
  label: size,
  render: () => <CheckListCell tags={sizeTags} values={['orcs']} size={size} onChange={() => {}} />,
}));

export const AllSizes = meta.story({
  tags: ['visual'],
  render: () => <StateGrid rows={sizeRows} columns={sizeColumns} />,
});

export const LongLabels = meta.story({
  args: {
    tags: [
      { label: 'Нежить и призраки северных земель', count: 12 },
      { label: 'Стражи древнего храма', count: 3 },
      { label: 'Undead Guardians of the North', count: 24 },
    ],
    values: ['Нежить и призраки северных земель'],
  },
});

export const TapTogglesRows = meta.story({
  tags: ['!dev'],
  args: { tags, values: ['orcs', 'ferry'], onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CheckList');
    await userEvent.click(canvas.getByText(t('goblins')));
    await expect(args.onChange).toHaveBeenLastCalledWith(['orcs', 'ferry', 'goblins']);
    await expect(canvas.getByRole('checkbox', { name: `${t('goblins')} 3` })).toBeChecked();
    await userEvent.click(canvas.getByText(t('orcs')));
    await expect(args.onChange).toHaveBeenLastCalledWith(['ferry', 'goblins']);
    await expect(canvas.getByRole('checkbox', { name: `${t('orcs')} 2` })).not.toBeChecked();
  },
});

export const ExactMatchHidesCreate = meta.story({
  tags: ['!dev'],
  args: { tags: typedLibrary, values: [], query: ' orcs ', onCreate: fn() },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CheckList');
    await expect(canvas.getByText('Orcs')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: anyValue(t, 'create', 'query') })).toBeNull();
    await expect(canvas.queryByText(t('noMatch'))).toBeNull();
  },
});

export const PartialMatchHidesCreate = meta.story({
  tags: ['!dev'],
  args: { tags: typedLibrary, values: [], query: 'S', onCreate: fn() },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CheckList');
    await expect(canvas.getByText('Mooks')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: anyValue(t, 'create', 'query') })).toBeNull();
    await expect(canvas.queryByText(t('noMatch'))).toBeNull();
  },
});

export const NewTagBadge = meta.story({
  args: {
    tags: [{ label: 'Elite', count: 0, badge: 'new' }, ...tags],
    values: ['Elite'],
  },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'CheckList');
    const created = canvas.getByRole('checkbox', { name: 'Elite new' });
    await expect(created).toBeChecked();
    const row = created.closest('label');
    await expect(row).toHaveAttribute('data-new');
    await expect(row && getComputedStyle(row).backgroundColor).toBe('rgb(255, 244, 210)');
    await expect(canvas.queryByText('0')).toBeNull();
    const plain = canvas.getByRole('checkbox', { name: `${t('orcs')} 2` }).closest('label');
    await expect(plain).not.toHaveAttribute('data-new');
  },
});

export const CreateFiresOnCreate = meta.story({
  tags: ['!dev'],
  args: { tags: library, values: [], query: ' Elite ', onCreate: fn(), onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CheckList');
    await userEvent.click(canvas.getByRole('button', { name: t('create', { query: 'Elite' }) }));
    await expect(args.onCreate).toHaveBeenCalledWith('Elite');
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const DisabledIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { tags, values: ['orcs'], disabled: true, onChange: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'CheckList');
    const goblins = canvas.getByRole('checkbox', { name: `${t('goblins')} 3` });
    await expect(goblins).toBeDisabled();
    await userEvent.click(canvas.getByText(t('goblins')), { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(goblins).not.toBeChecked();
  },
});
