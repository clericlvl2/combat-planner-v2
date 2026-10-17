import type { CombatSummary } from '@combat-planner/api/client';
import { LIMITS } from '@combat-planner/domain';
import type { CombatId } from '@combat-planner/domain';
import { ApiError } from '@combat-planner/api/client';
import {
  IconPlus,
  IconSearchOff,
  IconSortDescending,
  IconSwords,
  IconTrash,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ulid } from 'ulid';
import type { CombatColor } from '../../atoms/Swatch/Swatch.tsx';
import { useAccount } from '../../hooks/useAccount.ts';
import { useCombatList } from '../../hooks/useCombatList.ts';
import { useToasts } from '../../hooks/useToasts.ts';
import { EmptyState } from '../../molecules/EmptyState/EmptyState.tsx';
import { Toast } from '../../molecules/Toast/Toast.tsx';
import { BottomBar } from '../../organisms/BottomBar/BottomBar.tsx';
import { CombatCard } from '../../organisms/CombatCard/CombatCard.tsx';
import { Dialog } from '../../organisms/Dialog/Dialog.tsx';
import { Drawer } from '../../organisms/Drawer/Drawer.tsx';
import type { DrawerSection } from '../../organisms/Drawer/Drawer.tsx';
import { PageHeader } from '../../organisms/PageHeader/PageHeader.tsx';
import { SortSheet, combatSorts } from '../../organisms/SortSheet/SortSheet.tsx';
import type { CombatSort } from '../../organisms/SortSheet/SortSheet.tsx';
import { CantReachServer } from '../CantReachServer/CantReachServer.tsx';
import { toastLook } from '../shared/toastLook.ts';
import { CombatFormSheet, emptyCombatForm } from './CombatFormSheet/CombatFormSheet.tsx';
import type { CombatFormValue } from './CombatFormSheet/CombatFormSheet.tsx';
import classes from './CombatList.module.css';

export const COMBAT_SORT_KEY = 'combat-planner.combat-sort';

const DEFAULT_SORT: CombatSort = 'newestFirst';

const SORT_TOOL = 'sort';

const dayMs = 24 * 60 * 60 * 1000;

type Form = { mode: 'create'; id: CombatId } | { mode: 'edit'; id: CombatId };

export interface CombatListProps {
  now?: number;
}

export function readCombatSort(): CombatSort {
  try {
    const stored = globalThis.localStorage?.getItem(COMBAT_SORT_KEY);
    return combatSorts.find((sort) => sort === stored) ?? DEFAULT_SORT;
  } catch {
    return DEFAULT_SORT;
  }
}

function writeCombatSort(sort: CombatSort): void {
  try {
    globalThis.localStorage?.setItem(COMBAT_SORT_KEY, sort);
  } catch {
    return;
  }
}

const startOfDay = (time: number): number => {
  const day = new Date(time);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
};

export const daysSince = (now: number, iso: string | null): number | null =>
  iso === null
    ? null
    : Math.max(0, Math.round((startOfDay(now) - startOfDay(Date.parse(iso))) / dayMs));

const playedAt = (summary: CombatSummary): number =>
  summary.lastPlayedAt === null ? Number.NEGATIVE_INFINITY : Date.parse(summary.lastPlayedAt);

export function sortCombats(
  combats: readonly CombatSummary[],
  sort: CombatSort,
  locale: string,
): CombatSummary[] {
  if (sort === 'lastPlayed') return combats.toSorted((a, b) => playedAt(b) - playedAt(a));
  if (sort === 'alphabetical') {
    return combats.toSorted((a, b) => a.title.localeCompare(b.title, locale));
  }
  return [...combats];
}

export function searchCombats(
  combats: readonly CombatSummary[],
  query: string,
  locale: string,
): CombatSummary[] {
  const needle = query.trim().toLocaleLowerCase(locale);
  if (needle === '') return [...combats];
  return combats.filter((combat) =>
    `${combat.title}\n${combat.description}`.toLocaleLowerCase(locale).includes(needle),
  );
}

export function CombatList({ now = Date.now() }: CombatListProps) {
  const { t, i18n } = useTranslation('CombatList');
  const { t: tSort } = useTranslation('SortSheet');
  const { t: tEmpty } = useTranslation('EmptyState');
  const { t: tBar } = useTranslation('BottomBar');
  const { t: tDialog } = useTranslation('Dialog');
  const navigate = useNavigate();
  const { combats, error, refetch, create, update, duplicate, remove } = useCombatList();
  const { session } = useAccount();
  const { toasts, dismiss } = useToasts();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CombatSort>(readCombatSort);
  const [sortOpen, setSortOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<CombatId | null>(null);
  const [menuId, setMenuId] = useState<CombatId | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [deleteId, setDeleteId] = useState<CombatId | null>(null);
  const signedOut = error instanceof ApiError && error.code === 'unauthorized';

  useEffect(() => {
    if (signedOut) void navigate('/auth/sign-in');
  }, [signedOut, navigate]);

  const locale = i18n.language;
  const all = combats ?? [];
  const loaded = combats !== undefined;
  const visible = searchCombats(sortCombats(all, sort, locale), query, locale);
  const atLimit = all.length >= LIMITS.combatsPerDm;
  const custom = sort !== DEFAULT_SORT;
  const editing = form?.mode === 'edit' ? all.find((combat) => combat.id === form.id) : undefined;
  const deleting = all.find((combat) => combat.id === deleteId);

  const openForm = (next: Form) => {
    setFormKey((key) => key + 1);
    setForm(next);
    setFormOpen(true);
  };

  const changeSort = (next: CombatSort) => {
    setSort(next);
    writeCombatSort(next);
  };

  const submit = async (value: CombatFormValue) => {
    if (form === null || pending) return;
    setPending(true);
    try {
      if (form.mode === 'create') {
        await create({ id: form.id, ...value });
        setFormOpen(false);
        void navigate(`/combats/${form.id}`);
      } else {
        await update(form.id, value);
        setFormOpen(false);
      }
    } catch {
      return;
    } finally {
      setPending(false);
    }
  };

  const selectMenu = (combat: CombatSummary, action: 'duplicate' | 'delete') => {
    setMenuId(null);
    if (action === 'delete') {
      setDeleteId(combat.id);
      return;
    }
    setExpandedId(null);
    duplicate(combat.id, ulid()).catch(() => {});
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

  if (combats === undefined && error !== null) {
    if (signedOut) return null;
    return <CantReachServer onRetry={() => void refetch()} />;
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
                  label: custom ? tSort(sort) : undefined,
                  'aria-label': custom ? undefined : t('sort'),
                  active: custom,
                },
              ]
            : []
        }
        onTool={() => setSortOpen(true)}
      />
      <div className={classes.list}>
        {visible.map((combat) => (
          <CombatCard
            key={combat.id}
            title={combat.title}
            description={combat.description}
            color={combat.color}
            status={combat.status}
            round={combat.round}
            units={combat.unitCount}
            lastPlayedDays={sort === 'lastPlayed' ? daysSince(now, combat.lastPlayedAt) : undefined}
            expanded={expandedId === combat.id}
            menuOpen={menuId === combat.id}
            duplicateDisabled={atLimit}
            onOpen={() => navigate(`/combats/${combat.id}`)}
            onToggle={() => {
              setMenuId(null);
              setExpandedId((current) => (current === combat.id ? null : combat.id));
            }}
            onEdit={() => openForm({ mode: 'edit', id: combat.id })}
            onMore={() => setMenuId((current) => (current === combat.id ? null : combat.id))}
            onMenuClose={() => setMenuId(null)}
            onMenuSelect={(action) => selectMenu(combat, action)}
          />
        ))}
        {loaded && all.length === 0 ? (
          <EmptyState
            icon={IconSwords}
            title={tEmpty('noCombatsTitle')}
            body={tEmpty('noCombatsBody')}
          />
        ) : null}
        {all.length > 0 && visible.length === 0 ? (
          <EmptyState
            icon={IconSearchOff}
            title={tEmpty('noResultsTitle')}
            body={tEmpty('noResultsBody', { query: query.trim() })}
          />
        ) : null}
      </div>
      <BottomBar
        label={tBar('newCombat')}
        icon={IconPlus}
        disabled={!loaded || atLimit}
        hint={atLimit ? tBar('combatLimitReached') : undefined}
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
        context="combats"
        opened={sortOpen}
        value={sort}
        onChange={changeSort}
        onClose={() => setSortOpen(false)}
      />
      {form !== null ? (
        <CombatFormSheet
          key={formKey}
          opened={formOpen}
          pending={pending}
          mode={form.mode}
          value={
            editing
              ? {
                  title: editing.title,
                  description: editing.description,
                  color: editing.color as CombatColor,
                }
              : emptyCombatForm
          }
          onSubmit={(value) => {
            submit(value).catch(() => {});
          }}
          onClose={() => setFormOpen(false)}
        />
      ) : null}
      <Dialog
        opened={deleting !== undefined}
        icon={IconTrash}
        title={tDialog('deleteCombatTitle', { name: deleting?.title ?? '' })}
        body={tDialog('deleteCombatBody', { count: deleting?.unitCount ?? 0 })}
        confirmLabel={tDialog('delete')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
      <Drawer
        opened={drawerOpen}
        current="combats"
        email={session?.email ?? ''}
        onNavigate={navigateTo}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
