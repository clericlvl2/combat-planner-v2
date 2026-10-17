import type { Preset, PresetId, Role, Tag } from '@combat-planner/domain';
import { LIMITS, duplicateName, normalizeTag } from '@combat-planner/domain';
import {
  IconAlertTriangle,
  IconBookmark,
  IconBooks,
  IconCopy,
  IconPlus,
  IconSearchOff,
  IconSortDescending,
  IconTags,
  IconTrash,
  IconWifiOff,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ulid } from 'ulid';
import { useAccount } from '../../hooks/useAccount.ts';
import { usePresets } from '../../hooks/usePresets.ts';
import { useTags } from '../../hooks/useTags.ts';
import { useToasts } from '../../hooks/useToasts.ts';
import type { ToastItem } from '../../hooks/toasts.ts';
import { EmptyState } from '../../molecules/EmptyState/EmptyState.tsx';
import { Toast } from '../../molecules/Toast/Toast.tsx';
import type { ToastTone } from '../../molecules/Toast/Toast.tsx';
import { BottomBar } from '../../organisms/BottomBar/BottomBar.tsx';
import { Dialog } from '../../organisms/Dialog/Dialog.tsx';
import { Drawer } from '../../organisms/Drawer/Drawer.tsx';
import type { DrawerSection } from '../../organisms/Drawer/Drawer.tsx';
import { PageHeader } from '../../organisms/PageHeader/PageHeader.tsx';
import { PresetCard } from '../../organisms/PresetCard/PresetCard.tsx';
import { SortSheet, presetSorts } from '../../organisms/SortSheet/SortSheet.tsx';
import type { PresetSort } from '../../organisms/SortSheet/SortSheet.tsx';
import { TagSheet } from '../../organisms/TagSheet/TagSheet.tsx';
import type { TagSheetTag } from '../../organisms/TagSheet/TagSheet.tsx';
import { PresetFormSheet, emptyPresetForm } from './PresetFormSheet/PresetFormSheet.tsx';
import type { PresetFormValue } from './PresetFormSheet/PresetFormSheet.tsx';
import classes from './Library.module.css';

export const PRESET_SORT_KEY = 'combat-planner.preset-sort';

const DEFAULT_SORT: PresetSort = 'newestFirst';

const SORT_TOOL = 'sort';

const TAGS_TOOL = 'tags';

const typeOrder: Record<Role, number> = { enemy: 0, ally: 1, hero: 2 };

type ToastKind = 'added' | 'duplicated' | 'deleted';

const toastLooks: Record<ToastKind | 'failed' | 'other', { icon: Icon; tone: ToastTone }> = {
  added: { icon: IconBookmark, tone: 'success' },
  duplicated: { icon: IconCopy, tone: 'success' },
  deleted: { icon: IconTrash, tone: 'neutral' },
  failed: { icon: IconWifiOff, tone: 'error' },
  other: { icon: IconAlertTriangle, tone: 'warning' },
};

type Form = { mode: 'create' } | { mode: 'edit'; id: PresetId };

export function readPresetSort(): PresetSort {
  try {
    const stored = globalThis.localStorage?.getItem(PRESET_SORT_KEY);
    return presetSorts.find((sort) => sort === stored) ?? DEFAULT_SORT;
  } catch {
    return DEFAULT_SORT;
  }
}

function writePresetSort(sort: PresetSort): void {
  try {
    globalThis.localStorage?.setItem(PRESET_SORT_KEY, sort);
  } catch {
    return;
  }
}

export function sortPresets(
  presets: readonly Preset[],
  sort: PresetSort,
  locale: string,
): Preset[] {
  const byName = (a: Preset, b: Preset) => a.name.localeCompare(b.name, locale);
  if (sort === 'alphabetical') return presets.toSorted(byName);
  if (sort === 'byType') {
    return presets.toSorted((a, b) => typeOrder[a.role] - typeOrder[b.role] || byName(a, b));
  }
  return [...presets];
}

export function filterPresets(
  presets: readonly Preset[],
  query: string,
  tagIds: readonly string[],
  locale: string,
): Preset[] {
  const needle = query.trim().toLocaleLowerCase(locale);
  return presets.filter(
    (preset) =>
      (needle === '' || preset.name.toLocaleLowerCase(locale).includes(needle)) &&
      (tagIds.length === 0 || preset.tags.some((tag) => tagIds.includes(tag))),
  );
}

export function tagCounts(presets: readonly Preset[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const preset of presets) {
    for (const tag of preset.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return counts;
}

const formValueOf = (preset: Preset): PresetFormValue => ({
  name: preset.name,
  role: preset.role,
  maxHp: preset.maxHp,
  ac: preset.ac,
  pd: preset.pd,
  md: preset.md,
  initiativeBonus: preset.initiativeBonus,
  tags: [...preset.tags],
});

export function Library() {
  const { t, i18n } = useTranslation('Library');
  const { t: tSort } = useTranslation('SortSheet');
  const { t: tEmpty } = useTranslation('EmptyState');
  const { t: tBar } = useTranslation('BottomBar');
  const { t: tDialog } = useTranslation('Dialog');
  const { t: tToast } = useTranslation('Toast');
  const navigate = useNavigate();
  const { presets, create, update, duplicate, remove } = usePresets();
  const { tags, create: createTag } = useTags();
  const { session } = useAccount();
  const { toasts, show, dismiss } = useToasts();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string[]>([]);
  const [filterDraft, setFilterDraft] = useState<string[] | null>(null);
  const [sort, setSort] = useState<PresetSort>(readPresetSort);
  const [sortOpen, setSortOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<PresetId | null>(null);
  const [menuId, setMenuId] = useState<PresetId | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [deleteId, setDeleteId] = useState<PresetId | null>(null);
  const toastKinds = useRef(new Map<string, ToastKind>());

  const locale = i18n.language;
  const all = presets ?? [];
  const allTags = tags ?? [];
  const loaded = presets !== undefined;
  const counts = tagCounts(all);
  const tagName = (id: string) => allTags.find((tag) => tag.id === id)?.name ?? '';
  const activeFilter = filter.filter((id) => (counts.get(id) ?? 0) > 0);
  const visible = filterPresets(sortPresets(all, sort, locale), query, activeFilter, locale);
  const atLimit = all.length >= LIMITS.presetsPerDm;
  const custom = sort !== DEFAULT_SORT;
  const editing = form?.mode === 'edit' ? all.find((preset) => preset.id === form.id) : undefined;
  const deleting = all.find((preset) => preset.id === deleteId);
  const sheetTags: TagSheetTag[] = allTags
    .map((tag) => ({ id: tag.id, name: tag.name, count: counts.get(tag.id) ?? 0 }))
    .toSorted((a, b) => b.count - a.count);
  const filterTags = sheetTags.filter((tag) => (tag.count ?? 0) > 0);
  const draftFilter = filterDraft ?? activeFilter;
  const draftCount = filterPresets(all, query, draftFilter, locale).length;

  const openForm = (next: Form) => {
    setFormKey((key) => key + 1);
    setForm(next);
  };

  const changeSort = (next: PresetSort) => {
    setSort(next);
    writePresetSort(next);
  };

  const rememberToast = (kind: ToastKind, message: string) => {
    toastKinds.current.set(message, kind);
  };

  const tagFor = (name: string): Tag => {
    const trimmed = name.trim();
    const existing = allTags.find((tag) => normalizeTag(tag.name) === normalizeTag(trimmed));
    if (existing) return existing;
    const tag: Tag = { id: ulid(), name: trimmed };
    createTag(tag).catch(() => {});
    return tag;
  };

  const submit = async (value: PresetFormValue) => {
    if (form === null) return;
    try {
      if (form.mode === 'create') {
        await create({ id: ulid(), ...value });
        setForm(null);
        const message = tToast('presetAdded', { name: value.name });
        rememberToast('added', message);
        show({ message });
      } else {
        await update(form.id, value);
        setForm(null);
      }
    } catch {
      return;
    }
  };

  const duplicatePreset = (preset: Preset) => {
    setMenuId(null);
    setExpandedId(null);
    const copyName = duplicateName(
      preset.name,
      all.map((item) => item.name),
    );
    rememberToast('duplicated', tToast('presetDuplicated', { name: copyName }));
    duplicate(preset.id, ulid()).catch(() => {});
  };

  const confirmDelete = () => {
    if (deleting === undefined) return;
    setDeleteId(null);
    setExpandedId(null);
    rememberToast('deleted', tToast('deleted', { title: deleting.name }));
    remove(deleting.id).catch(() => {});
  };

  const navigateTo = (section: DrawerSection) => {
    void navigate(`/${section}`);
  };

  const lookOf = (toast: ToastItem) => {
    if (toast.action) return toastLooks.failed;
    const kind = toastKinds.current.get(toast.message);
    if (kind) return toastLooks[kind];
    const added = all.some(
      (preset) => tToast('presetAdded', { name: preset.name }) === toast.message,
    );
    return added ? toastLooks.added : toastLooks.other;
  };

  const toast = toasts[0];

  return (
    <div className={classes.root}>
      <PageHeader
        title={t('title')}
        onMenu={() => setDrawerOpen(true)}
        search={{ value: query, placeholder: t('search') }}
        onSearch={setQuery}
        tools={
          all.length > 0
            ? [
                {
                  id: SORT_TOOL,
                  icon: IconSortDescending,
                  label: custom ? tSort(sort) : undefined,
                  'aria-label': custom ? undefined : t('sort'),
                  active: custom,
                },
                {
                  id: TAGS_TOOL,
                  icon: IconTags,
                  label: t('tags'),
                  count: activeFilter.length > 0 ? activeFilter.length : undefined,
                  active: activeFilter.length > 0,
                },
              ]
            : []
        }
        onTool={(id) => (id === SORT_TOOL ? setSortOpen(true) : setFilterDraft(activeFilter))}
        filters={activeFilter.map((id) => ({ id, label: tagName(id) }))}
        onRemoveFilter={(id) => setFilter(activeFilter.filter((tag) => tag !== id))}
        onClearFilters={() => setFilter([])}
      />
      <div className={classes.list}>
        {visible.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            tags={preset.tags.map(tagName).filter((name) => name !== '')}
            expanded={expandedId === preset.id}
            menuOpened={menuId === preset.id}
            onToggle={() => {
              setMenuId(null);
              setExpandedId((current) => (current === preset.id ? null : preset.id));
            }}
            onEdit={() => openForm({ mode: 'edit', id: preset.id })}
            onMore={() => setMenuId((current) => (current === preset.id ? null : preset.id))}
            onMenuClose={() => setMenuId(null)}
            onDuplicate={() => duplicatePreset(preset)}
            onDelete={() => {
              setMenuId(null);
              setDeleteId(preset.id);
            }}
          />
        ))}
        {loaded && all.length === 0 ? (
          <EmptyState icon={IconBooks} title={t('emptyTitle')} body={t('emptyBody')} />
        ) : null}
        {all.length > 0 && visible.length === 0 ? (
          <EmptyState
            icon={IconSearchOff}
            title={tEmpty('noResultsTitle')}
            body={t('noResultsBody', { query: query.trim() })}
          />
        ) : null}
      </div>
      <BottomBar
        label={tBar('newPreset')}
        icon={IconPlus}
        disabled={!loaded || atLimit}
        hint={atLimit ? t('limitReached') : undefined}
        onClick={() => openForm({ mode: 'create' })}
      />
      {toast ? (
        <Toast
          key={toast.id}
          {...lookOf(toast)}
          message={toast.message}
          action={toast.action}
          duration={toast.duration}
          onHide={() => dismiss(toast.id)}
        />
      ) : null}
      <SortSheet
        context="presets"
        opened={sortOpen}
        value={sort}
        onChange={changeSort}
        onClose={() => setSortOpen(false)}
      />
      <TagSheet
        opened={filterDraft !== null}
        mode="filter"
        tags={filterTags}
        value={draftFilter}
        presetCount={draftCount}
        onChange={setFilterDraft}
        onDone={() => {
          setFilter(draftFilter);
          setFilterDraft(null);
        }}
        onClose={() => setFilterDraft(null)}
      />
      {form !== null ? (
        <PresetFormSheet
          key={formKey}
          opened
          mode={form.mode}
          value={editing ? formValueOf(editing) : emptyPresetForm}
          tags={sheetTags}
          onSubmit={(value) => {
            submit(value).catch(() => {});
          }}
          onCreateTag={tagFor}
          onClose={() => setForm(null)}
        />
      ) : null}
      <Dialog
        opened={deleting !== undefined}
        icon={IconTrash}
        title={tDialog('deletePresetTitle', { name: deleting?.name ?? '' })}
        body={tDialog('deletePresetBody')}
        confirmLabel={tDialog('delete')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
      <Drawer
        opened={drawerOpen}
        current="library"
        email={session?.email ?? ''}
        onNavigate={navigateTo}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
