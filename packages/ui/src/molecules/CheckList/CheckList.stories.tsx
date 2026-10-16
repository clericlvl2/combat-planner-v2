import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/CheckList.json';
import { CheckList } from './CheckList.tsx';
import type { CheckListOption, CheckListProps } from './CheckList.tsx';

type TagKey = Exclude<keyof typeof en, 'create' | 'noMatch'>;

interface CellOption {
  key?: TagKey;
  label?: string;
  count: number;
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
  }));
  return (
    <div style={{ width: width + 24, padding: 12, background: 'var(--cp-color-surface)' }}>
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

const sizeTags: readonly CellOption[] = [
  { key: 'orcs', count: 2 },
  { key: 'goblins', count: 3 },
];

const meta = preview.meta({
  title: 'Molecules/CheckList',
  component: CheckListCell,
  args: { tags, values: ['orcs', 'ferry'], onChange: fn() },
});

export const Anatomy = meta.story({
  args: { tags, values: ['orcs', 'ferry'] },
});

export const VariantsTags = meta.story({
  name: 'Variants · tags',
  args: { tags, values: ['orcs', 'ferry'] },
});

export const VariantsQueryMatch = meta.story({
  name: 'Variants · query match',
  args: { tags: library, values: [], query: 'mo', onCreate: fn() },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByText('Mooks')).toBeVisible();
    await expect(canvas.queryByRole('checkbox', { name: 'Orcs 2' })).toBeNull();
    const create = canvas.getByRole('button', { name: 'Create “mo”' });
    const rows = canvas.getByRole('group').children;
    await expect(rows[rows.length - 1]).toBe(create);
    await expect(rows[0]).toHaveAttribute('data-active');
    await expect(args.onCreate).not.toHaveBeenCalled();
  },
});

export const VariantsNoMatch = meta.story({
  name: 'Variants · no match',
  args: { tags: library, values: [], query: 'Elite', onCreate: fn() },
  play: async ({ canvas }) => {
    const create = canvas.getByRole('button', { name: 'Create “Elite”' });
    await expect(canvas.getByRole('group').firstElementChild).toBe(create);
    await expect(create).toHaveAttribute('data-active');
    await expect(canvas.getByText('No tags match')).toBeVisible();
    await expect(canvas.queryAllByRole('checkbox')).toHaveLength(0);
  },
});

export const CheckListS = meta.story({
  name: 'CheckList · S',
  args: { tags: sizeTags, values: ['orcs'], size: 'S', width: 330 },
});

export const CheckListM = meta.story({
  name: 'CheckList · M',
  args: { tags: sizeTags, values: ['orcs'], size: 'M', width: 330 },
});

export const CheckListL = meta.story({
  name: 'CheckList · L',
  args: { tags: sizeTags, values: ['orcs'], size: 'L', width: 330 },
});

export const TagsMixed = meta.story({
  name: 'Tags · mixed',
  args: {
    tags: [
      { label: 'Untote Wächter des Nordens', count: 12 },
      { label: 'Нежить и призраки', count: 3 },
      { label: 'アンデッド', count: 24 },
    ],
    values: ['Untote Wächter des Nordens'],
  },
});

export const ExtraToggle = meta.story({
  name: 'Toggle rows',
  args: { tags, values: ['orcs', 'ferry'], onChange: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByText('Goblins'));
    await expect(args.onChange).toHaveBeenLastCalledWith(['orcs', 'ferry', 'goblins']);
    await expect(canvas.getByRole('checkbox', { name: 'Goblins 3' })).toBeChecked();
    await userEvent.click(canvas.getByText('Orcs'));
    await expect(args.onChange).toHaveBeenLastCalledWith(['ferry', 'goblins']);
    await expect(canvas.getByRole('checkbox', { name: 'Orcs 2' })).not.toBeChecked();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Space and Enter',
  args: { tags, values: [], onChange: fn() },
  play: async ({ args, canvas }) => {
    const orcs = canvas.getByRole('checkbox', { name: 'Orcs 2' });
    await userEvent.tab();
    await expect(orcs).toHaveFocus();
    await userEvent.keyboard('[Space]');
    await expect(args.onChange).toHaveBeenLastCalledWith(['orcs']);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await expect(args.onChange).toHaveBeenLastCalledWith(['orcs', 'ferry']);
    await userEvent.keyboard('{Enter}');
    await expect(args.onChange).toHaveBeenLastCalledWith(['orcs']);
    await expect(args.onChange).toHaveBeenCalledTimes(3);
  },
});

export const ExtraExactMatch = meta.story({
  name: 'Exact match hides Create',
  args: { tags: library, values: [], query: ' orcs ', onCreate: fn() },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Orcs')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: /Create/ })).toBeNull();
    await expect(canvas.queryByText('No tags match')).toBeNull();
  },
});

export const ExtraPartialMatch = meta.story({
  name: 'Partial match shows Create',
  args: { tags: library, values: [], query: 'Orc', onCreate: fn() },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Orcs')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Create “Orc”' })).toBeVisible();
  },
});

export const ExtraCreate = meta.story({
  name: 'Create the typed tag',
  args: { tags: library, values: [], query: ' Elite ', onCreate: fn(), onChange: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Create “Elite”' }));
    await expect(args.onCreate).toHaveBeenCalledWith('Elite');
    await expect(args.onChange).not.toHaveBeenCalled();
  },
});

export const ExtraDisabled = meta.story({
  name: 'Disabled',
  args: { tags, values: ['orcs'], disabled: true, onChange: fn() },
  play: async ({ args, canvas }) => {
    const goblins = canvas.getByRole('checkbox', { name: 'Goblins 3' });
    await expect(goblins).toBeDisabled();
    await userEvent.click(canvas.getByText('Goblins'), { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(goblins).not.toBeChecked();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { tags: library, values: [], query: 'Элита', onCreate: fn() },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Создать «Элита»' })).toBeVisible();
    await expect(canvas.getByText('Нет подходящих тегов')).toBeVisible();
  },
});
