import { ApiError } from '@combat-planner/api/client';
import type { Preset, PresetId, Role, Tag, TagId } from '@combat-planner/domain';
import { LIMITS, normalizeTag } from '@combat-planner/domain';
import {
  IconBooks,
  IconPlus,
  IconSearchOff,
  IconSortDescending,
  IconTags,
  IconTrash,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ulid } from 'ulid';
import { queryKeys } from '../../hooks/queryKeys.ts';
import { useAccount } from '../../hooks/useAccount.ts';
import { usePresets } from '../../hooks/usePresets.ts';
import { useTags } from '../../hooks/useTags.ts';
import { useToasts } from '../../hooks/useToasts.ts';
import { EmptyState } from '../../molecules/EmptyState/EmptyState.tsx';
import { Toast } from '../../molecules/Toast/Toast.tsx';
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
import { CantReachServer } from '../CantReachServer/CantReachServer.tsx';
import { toastLook } from '../shared/toastLook.ts';
import { PresetFormSheet, emptyPresetForm } from './PresetFormSheet/PresetFormSheet.tsx';
import type { PresetFormValue } from './PresetFormSheet/PresetFormSheet.tsx';
import classes from './Library.module.css';

export const PRESET_SORT_KEY = 'combat-planner.preset-sort';

const DEFAULT_SORT: PresetSort = 'newestFirst';

const SORT_TOOL = 'sort';

const TAGS_TOOL = 'tags';

const typeOrder: Record<Role, number> = { enemy: 0, ally: 1, hero: 2 };

type Form = { mode: 'create'; id: PresetId } | { mode: 'edit'; id: PresetId };

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
  const queryClient = useQueryClient();
  const { presets, error, create, update, duplicate, remove } = usePresets();
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
  const [pending, setPending] = useState(false);
  const tagCreates = useRef(new Map<TagId, Promise<Tag>>());
  const failedTags = useRef(new Map<TagId, string>());
  const signedOut =
    session === null || (error instanceof ApiError && error.code === 'unauthorized');

  useEffect(() => {
    if (signedOut) void navigate('/auth/sign-in');
  }, [signedOut, navigate]);

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

  const tagFor = (name: string): Tag => {
    const trimmed = name.trim();
    const existing = allTags.find((tag) => normalizeTag(tag.name) === normalizeTag(trimmed));
    if (existing) return existing;
    const tag: Tag = { id: ulid(), name: trimmed };
    const created = createTag(tag);
    tagCreates.current.set(tag.id, created);
    created.catch((reason: unknown) => {
      tagCreates.current.delete(tag.id);
      const message =
        reason instanceof ApiError && reason.code === 'limit'
          ? t('tagLimitReached')
          : t('tagFailed', { name: tag.name });
      failedTags.current.set(tag.id, message);
      if (reason instanceof ApiError && reason.code === 'network') return;
      show({ message, kind: 'error' });
    });
    return tag;
  };

  const settleTags = (ids: readonly TagId[]) =>
    Promise.all(
      ids.flatMap((id) => {
        const created = tagCreates.current.get(id);
        return created ? [created.catch(() => undefined)] : [];
      }),
    );

  const failedTagOf = (ids: readonly TagId[]): string | undefined => {
    for (const tag of queryClient.getQueryData<Tag[]>(queryKeys.tags) ?? []) {
      failedTags.current.delete(tag.id);
    }
    return ids.map((id) => failedTags.current.get(id)).find((message) => message !== undefined);
  };

  const submit = async (value: PresetFormValue) => {
    if (form === null || pending) return;
    setPending(true);
    try {
      await settleTags(value.tags);
      const failedTag = failedTagOf(value.tags);
      if (failedTag !== undefined) {
        show({ message: failedTag, kind: 'error' });
        return;
      }
      if (form.mode === 'create') {
        await create({ id: form.id, ...value });
        setForm(null);
        show({ message: tToast('presetAdded', { name: value.name }), kind: 'success' });
      } else {
        await update(form.id, value);
        setForm(null);
      }
    } catch {
      return;
    } finally {
      setPending(false);
    }
  };

  const duplicatePreset = (preset: Preset) => {
    setMenuId(null);
    setExpandedId(null);
    duplicate(preset.id, ulid()).catch(() => {});
  };

  const confirmDelete = () => {
    if (deleting === undefined) return;
    setDeleteId(null);
    setExpandedId(null);
    remove(deleting.id).catch(() => {});
  };

  const navigateTo = (section: DrawerSection) => {
    void navigate(`/${section}`);
  };

  const toast = toasts[0];

  if (presets === undefined && error !== null) {
    if (signedOut) return null;
    return (
      <CantReachServer
        onRetry={() => void queryClient.refetchQueries({ queryKey: queryKeys.presets })}
      />
    );
  }

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
                  'aria-label': custom ? tSort(sort) : t('sort'),
                  active: custom,
                },
                {
                  id: TAGS_TOOL,
                  icon: IconTags,
                  'aria-label': t('tags'),
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
            duplicateDisabled={atLimit}
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
        onClick={() => openForm({ mode: 'create', id: ulid() })}
      />
      {toast ? (
        <Toast
          key={toast.id}
          {...toastLook(toast.kind)}
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
          pending={pending}
          mode={form.mode}
          value={editing ? formValueOf(editing) : emptyPresetForm}
          tags={sheetTags}
          onSubmit={(value) => {
            submit(value).catch(() => {});
          }}
          onCreateTag={tagFor}
          tagHint={allTags.length >= LIMITS.tagsPerDm ? t('tagLimitReached') : undefined}
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
