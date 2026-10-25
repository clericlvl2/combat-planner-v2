import type { CombatSummary } from '@combat-planner/api/client';
import { LIMITS } from '@combat-planner/domain';
import type { CombatId } from '@combat-planner/domain';
import { ApiError } from '@combat-planner/api/client';
import {
  IconFileImport,
  IconPlus,
  IconSearchOff,
  IconSortDescending,
  IconSwords,
  IconTrash,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ulid } from 'ulid';
import type { CombatColor } from '../../atoms/Swatch/Swatch.tsx';
import { useAccount } from '../../hooks/useAccount.ts';
import { useCombatList } from '../../hooks/useCombatList.ts';
import { useDelayed } from '../../hooks/useDelayed.ts';
import { useToasts } from '../../hooks/useToasts.ts';
import { CardSkeleton } from '../../molecules/CardSkeleton/CardSkeleton.tsx';
import { EmptyState } from '../../molecules/EmptyState/EmptyState.tsx';
import { ScrollList } from '../../molecules/ScrollList/ScrollList.tsx';
import { Toast } from '../../molecules/Toast/Toast.tsx';
import { BottomBar } from '../../organisms/BottomBar/BottomBar.tsx';
import { CombatCard } from '../../organisms/CombatCard/CombatCard.tsx';
import type { CombatCardAction } from '../../organisms/CombatCard/CombatCard.tsx';
import { Dialog } from '../../organisms/Dialog/Dialog.tsx';
import { Drawer } from '../../organisms/Drawer/Drawer.tsx';
import type { DrawerSection } from '../../organisms/Drawer/Drawer.tsx';
import { PageHeader } from '../../organisms/PageHeader/PageHeader.tsx';
import { SortSheet, combatSorts } from '../../organisms/SortSheet/SortSheet.tsx';
import type { CombatSort } from '../../organisms/SortSheet/SortSheet.tsx';
import { CantReachServer } from '../CantReachServer/CantReachServer.tsx';
import { COMBAT_FILE_ACCEPT, readCombatFile, saveCombatFile } from '../shared/combatFile.ts';
import { hasCode } from '../shared/hasCode.ts';
import { toastLook } from '../shared/toastLook.ts';
import { CombatFormSheet, emptyCombatForm } from './CombatFormSheet/CombatFormSheet.tsx';
import type { CombatFormValue } from './CombatFormSheet/CombatFormSheet.tsx';
import classes from './CombatList.module.css';

export const COMBAT_SORT_KEY = 'combat-planner.combat-sort';

const DEFAULT_SORT: CombatSort = 'newestFirst';

const SORT_TOOL = 'sort';

const IMPORT_TOOL = 'import';

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
  const {
    combats,
    error,
    refetch,
    create,
    update,
    duplicate,
    remove,
    importCombat,
    fetchDocument,
  } = useCombatList();
  const { session } = useAccount();
  const { toasts, dismiss, show: showToast, t: tToast } = useToasts();
  const fileRef = useRef<HTMLInputElement | null>(null);
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
  const [busyId, setBusyId] = useState<CombatId | null>(null);
  const [removing, setRemoving] = useState(false);
  const [importing, setImporting] = useState(false);
  const signedOut =
    session === null || (error instanceof ApiError && error.code === 'unauthorized');

  useEffect(() => {
    if (signedOut) void navigate('/auth/sign-in');
  }, [signedOut, navigate]);

  const locale = i18n.language;
  const all = combats ?? [];
  const loaded = combats !== undefined;
  const skeleton = useDelayed(!loaded && error === null);
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
      if (form.mode === 'create') await create({ id: form.id, ...value });
      else await update(form.id, value);
      setFormOpen(false);
    } catch {
      return;
    } finally {
      setPending(false);
    }
  };

  const selectMenu = (combat: CombatSummary, action: CombatCardAction) => {
    setMenuId(null);
    if (action === 'delete') {
      setDeleteId(combat.id);
      return;
    }
    if (busyId !== null) return;
    setBusyId(combat.id);
    const request =
      action === 'export'
        ? fetchDocument(combat.id).then(saveCombatFile)
        : duplicate(combat.id, ulid()).then(() => setExpandedId(null));
    request
      .catch(() => {})
      .finally(() => {
        setBusyId(null);
      });
  };

  const invalidFile = () => {
    showToast({ message: tToast('invalidFile'), kind: 'error' });
  };

  const selectTool = (id: string) => {
    if (id === SORT_TOOL) setSortOpen(true);
  };

  const pickImportFile = () => {
    if (atLimit) {
      showToast({ message: tBar('combatLimitReached'), kind: 'warning' });
      return;
    }
    fileRef.current?.click();
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const picked = input.files?.[0];
    input.value = '';
    if (picked === undefined) return;
    const read = await readCombatFile(picked);
    if (read.kind === 'invalid') {
      invalidFile();
      return;
    }
    if (read.kind === 'unitLimit') {
      showToast({
        message: tToast('unitCap', { limit: LIMITS.unitsPerCombat }),
        kind: 'warning',
      });
      return;
    }
    setImporting(true);
    try {
      await importCombat(read.file);
    } catch (importError) {
      if (hasCode(importError, 'invalid')) invalidFile();
    } finally {
      setImporting(false);
    }
  };

  const confirmDelete = () => {
    if (deleting === undefined || removing) return;
    setRemoving(true);
    remove(deleting.id)
      .then(() => setExpandedId(null))
      .catch(() => {})
      .finally(() => {
        setRemoving(false);
        setDeleteId(null);
      });
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
                  'aria-label': custom ? tSort(sort) : t('sort'),
                  active: custom,
                },
              ]
            : []
        }
        onTool={selectTool}
        menu={{
          items: [{ id: IMPORT_TOOL, icon: IconFileImport, label: t('import'), disabled: !loaded }],
          onSelect: (id) => {
            if (id === IMPORT_TOOL) pickImportFile();
          },
          busy: importing,
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept={COMBAT_FILE_ACCEPT}
        hidden
        aria-label={t('import')}
        onChange={(event) => {
          importFile(event).catch(() => {});
        }}
      />
      <ScrollList className={classes.list} contentClassName={classes.listContent}>
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
            busy={busyId === combat.id}
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
        {skeleton ? <CardSkeleton variant="combat" count={4} /> : null}
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
      </ScrollList>
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
          now={now}
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
        loading={removing}
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
