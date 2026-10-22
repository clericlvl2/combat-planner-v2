import preview from '#.storybook/preview';
import { IconSortDescending, IconTags } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/PageHeader.json';
import { PageHeader } from './PageHeader.tsx';
import type { PageHeaderFilter, PageHeaderProps, PageHeaderTool } from './PageHeader.tsx';
import { storyT } from '../../storybook/storyT.ts';

type LabelKey = keyof typeof en;

type ToolSpec = 'sort' | 'sortActive' | 'tags';

interface PageHeaderCellProps extends Omit<
  PageHeaderProps,
  'title' | 'search' | 'tools' | 'filters' | 'action'
> {
  titleKey?: LabelKey;
  title?: string;
  nav?: 'menu' | 'back';
  searchKey?: LabelKey;
  searchPlaceholder?: string;
  query?: string;
  toolSpecs?: readonly ToolSpec[];
  tagsLabel?: string;
  tagCount?: number;
  toolDisabled?: boolean;
  filterKeys?: readonly LabelKey[];
  filterLabels?: readonly string[];
  actionKey?: LabelKey;
  actionDisabled?: boolean;
  onAction?: () => void;
}

function PageHeaderCell({
  titleKey = 'combats',
  title,
  nav = 'menu',
  searchKey,
  searchPlaceholder,
  query = '',
  toolSpecs = [],
  tagsLabel,
  tagCount = 1,
  toolDisabled = false,
  filterKeys = [],
  filterLabels,
  actionKey,
  actionDisabled = false,
  onAction,
  onMenu,
  onBack,
  onSearch,
  ...props
}: PageHeaderCellProps) {
  const { t } = useTranslation('PageHeader');
  const [value, setValue] = useState(query);
  const placeholder = searchPlaceholder ?? (searchKey ? t(searchKey) : undefined);
  const toolOf: Record<ToolSpec, PageHeaderTool> = {
    sort: { id: 'sort', icon: IconSortDescending, 'aria-label': t('sort') },
    sortActive: {
      id: 'sort',
      icon: IconSortDescending,
      'aria-label': t('lastPlayed'),
      active: true,
    },
    tags: {
      id: 'tags',
      icon: IconTags,
      'aria-label': tagsLabel ?? t('tags'),
      count: tagCount,
      active: true,
    },
  };
  const filters: PageHeaderFilter[] = filterLabels
    ? filterLabels.map((label, index) => ({ id: `tag${index + 1}`, label }))
    : filterKeys.map((key) => ({ id: key, label: t(key) }));
  return (
    <PageHeader
      {...props}
      title={title ?? t(titleKey)}
      onMenu={nav === 'menu' ? onMenu : undefined}
      onBack={nav === 'back' ? onBack : undefined}
      search={placeholder === undefined ? undefined : { value, placeholder }}
      onSearch={(next) => {
        setValue(next);
        onSearch?.(next);
      }}
      tools={toolSpecs.map((spec) => ({ ...toolOf[spec], disabled: toolDisabled }))}
      filters={filters}
      action={
        actionKey
          ? { label: t(actionKey), disabled: actionDisabled, onClick: () => onAction?.() }
          : undefined
      }
    />
  );
}

const meta = preview.meta({
  title: 'Organisms/PageHeader',
  component: PageHeaderCell,
  parameters: { phoneFrame: { overlay: true } },
  args: {
    onMenu: fn(),
    onBack: fn(),
    onSearch: fn(),
    onTool: fn(),
    onRemoveFilter: fn(),
    onClearFilters: fn(),
    onAction: fn(),
  },
});

const library = {
  titleKey: 'library',
  searchKey: 'searchPresets',
  toolSpecs: ['sort', 'tags'],
  filterKeys: ['orcs'],
} as const;

const combats = {
  titleKey: 'combats',
  searchKey: 'searchCombats',
  toolSpecs: ['sort'],
} as const;

export const LibraryFiltered = meta.story({
  tags: ['visual'],
  args: library,
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PageHeader');
    await expect(canvas.getByRole('heading', { level: 1, name: t('library') })).toBeVisible();
    await expect(canvas.getByRole('searchbox', { name: t('searchPresets') })).toBeVisible();
    const tags = canvas.getByRole('button', { name: t('tags') });
    await expect(tags).toHaveAttribute('data-active');
    await expect(tags).toHaveTextContent('1');
    const sort = canvas.getByRole('button', { name: t('sort') });
    await expect([sort, tags].map((tool) => tool.getBoundingClientRect().width)).toEqual([48, 48]);
    await expect(tags.getBoundingClientRect().top).toBe(sort.getBoundingClientRect().top);
    await expect(
      canvas.getByRole('button', { name: t('removeFilter', { name: t('orcs') }) }),
    ).toBeVisible();
  },
});

export const CombatsWithSort = meta.story({
  args: combats,
});

export const SortActive = meta.story({
  args: { ...combats, toolSpecs: ['sortActive'] },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PageHeader');
    const sort = canvas.getByRole('button', { name: t('lastPlayed') });
    await expect(sort).toHaveAttribute('data-active');
    await expect(sort.getBoundingClientRect().width).toBe(48);
  },
});

export const NestedScreen = meta.story({
  tags: ['visual'],
  args: { titleKey: 'settings', nav: 'back' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PageHeader');
    await expect(canvas.queryByRole('button', { name: t('openNavigation') })).toBeNull();
    await expect(canvas.queryByRole('searchbox')).toBeNull();
    await expect(canvas.getByRole('button', { name: t('back') })).toBeVisible();
  },
});

export const ManyLongFilters = meta.story({
  tags: ['visual'],
  args: {
    title: 'Библиотека',
    searchPlaceholder: 'Поиск заготовок',
    toolSpecs: ['sort', 'tags'],
    tagsLabel: 'Теги',
    tagCount: 12,
    filterLabels: ['Нежить и призраки', 'Орки', 'Переправа'],
  },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PageHeader');
    await expect(canvas.getByRole('button', { name: 'Теги' })).toHaveTextContent('12');
    const [before = '', after = ''] = t('removeFilter', { name: '\n' }).split('\n');
    const removeFilter = (label: string) => label.startsWith(before) && label.endsWith(after);
    await expect(canvas.getAllByRole('button', { name: removeFilter })).toHaveLength(3);
  },
});

export const ToolsDisabled = meta.story({
  args: { ...library, toolDisabled: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PageHeader');
    const sort = canvas.getByRole('button', { name: t('sort') });
    await expect(sort).toBeDisabled();
    await userEvent.click(sort, { pointerEventsCheck: 0 });
    await userEvent.click(canvas.getByRole('button', { name: t('tags') }), {
      pointerEventsCheck: 0,
    });
    await expect(args.onTool).not.toHaveBeenCalled();
  },
});

export const HeaderButton = meta.story({
  args: { titleKey: 'settings', nav: 'back', actionKey: 'done' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PageHeader');
    await userEvent.click(canvas.getByRole('button', { name: t('done') }));
    await expect(args.onAction).toHaveBeenCalledOnce();
  },
});

export const HeaderButtonDisabled = meta.story({
  args: { titleKey: 'settings', nav: 'back', actionKey: 'done', actionDisabled: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PageHeader');
    const done = canvas.getByRole('button', { name: t('done') });
    await expect(done).toBeDisabled();
    await userEvent.click(done, { pointerEventsCheck: 0 });
    await expect(args.onAction).not.toHaveBeenCalled();
  },
});
export const SearchWithQuery = meta.story({
  args: { ...combats, query: 'Засада' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'PageHeader');
    await expect(canvas.getByRole('searchbox', { name: t('searchCombats') })).toHaveValue('Засада');
    await expect(canvas.getByRole('button', { name: t('SearchField:clear') })).toBeVisible();
  },
});

export const LongTitle = meta.story({
  args: { ...combats, title: 'Кампания в Драконьем Империуме: осада переправы' },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('heading', {
        level: 1,
        name: 'Кампания в Драконьем Империуме: осада переправы',
      }),
    ).toBeVisible();
  },
});

export const BurgerOpensNavigation = meta.story({
  tags: ['!dev'],
  args: combats,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PageHeader');
    const burger = canvas.getByRole('button', { name: t('openNavigation') });
    await userEvent.click(burger);
    await expect(args.onMenu).toHaveBeenCalledOnce();
    await expect(args.onBack).not.toHaveBeenCalled();
  },
});

export const BackCallsOnBack = meta.story({
  tags: ['!dev'],
  args: { titleKey: 'settings', nav: 'back' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PageHeader');
    await userEvent.click(canvas.getByRole('button', { name: t('back') }));
    await expect(args.onBack).toHaveBeenCalledOnce();
    await expect(args.onMenu).not.toHaveBeenCalled();
  },
});

export const ToolsCallOnTool = meta.story({
  tags: ['!dev'],
  args: library,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PageHeader');
    await userEvent.click(canvas.getByRole('button', { name: t('sort') }));
    await expect(args.onTool).toHaveBeenCalledOnce();
    await expect(args.onTool).toHaveBeenLastCalledWith('sort');
    await userEvent.click(canvas.getByRole('button', { name: t('tags') }));
    await expect(args.onTool).toHaveBeenCalledTimes(2);
    await expect(args.onTool).toHaveBeenLastCalledWith('tags');
  },
});

export const ChipRemovesFilterClearRemovesAll = meta.story({
  tags: ['!dev'],
  args: library,
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'PageHeader');
    await userEvent.click(
      canvas.getByRole('button', { name: t('removeFilter', { name: t('orcs') }) }),
    );
    await expect(args.onRemoveFilter).toHaveBeenCalledOnce();
    await expect(args.onRemoveFilter).toHaveBeenCalledWith('orcs');
    await expect(args.onClearFilters).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: t('clear') }));
    await expect(args.onClearFilters).toHaveBeenCalledOnce();
  },
});
