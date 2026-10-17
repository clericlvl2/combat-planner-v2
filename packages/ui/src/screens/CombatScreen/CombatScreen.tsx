import { ApiError } from '@combat-planner/api/client';
import {
  LIMITS,
  nextTurnBlockReason,
  nextTurnTarget,
  presetFromUnit,
  turnOrder,
} from '@combat-planner/domain';
import type {
  Action,
  Combat,
  CombatId,
  Condition,
  HpHistoryKind,
  Role,
  Unit,
  UnitId,
} from '@combat-planner/domain';
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconBookmark,
  IconCheck,
  IconLinkOff,
  IconRefresh,
  IconTrash,
  IconUserMinus,
  IconUserPlus,
  IconUsers,
  IconWifiOff,
} from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ulid } from 'ulid';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import { combatKey } from '../../hooks/combat.ts';
import type { CombatEntry } from '../../hooks/combat.ts';
import type { ToastAction, ToastItem } from '../../hooks/toasts.ts';
import { useCombat } from '../../hooks/useCombat.ts';
import { useConnection } from '../../hooks/useConnection.ts';
import { usePresets } from '../../hooks/usePresets.ts';
import { useTags } from '../../hooks/useTags.ts';
import { useToasts } from '../../hooks/useToasts.ts';
import { EmptyState } from '../../molecules/EmptyState/EmptyState.tsx';
import { Toast } from '../../molecules/Toast/Toast.tsx';
import type { ToastTone } from '../../molecules/Toast/Toast.tsx';
import { CombatHeader } from '../../organisms/CombatHeader/CombatHeader.tsx';
import type {
  CombatHeaderPopover,
  CombatMenuAction,
} from '../../organisms/CombatHeader/CombatHeader.tsx';
import { ConditionPicker } from '../../organisms/ConditionPicker/ConditionPicker.tsx';
import { Dialog } from '../../organisms/Dialog/Dialog.tsx';
import type { DialogProps } from '../../organisms/Dialog/Dialog.tsx';
import { HpHistory } from '../../organisms/HpHistory/HpHistory.tsx';
import { NumpadSheet, useHpFlash } from '../../organisms/NumpadSheet/NumpadSheet.tsx';
import { ShareSheet } from '../../organisms/ShareSheet/ShareSheet.tsx';
import { TurnBar } from '../../organisms/TurnBar/TurnBar.tsx';
import { UnitForm } from '../../organisms/UnitForm/UnitForm.tsx';
import type { UnitDraft } from '../../organisms/UnitForm/UnitForm.tsx';
import { UnitRow } from '../../organisms/UnitRow/UnitRow.tsx';
import { CantReachServer } from '../CantReachServer/CantReachServer.tsx';
import { CombatNotFound } from '../CombatNotFound/CombatNotFound.tsx';
import { UnexpectedError } from '../UnexpectedError/UnexpectedError.tsx';
import { isUndoable, undoLabel } from './undoLabel.ts';
import type { UndoableAction } from './undoLabel.ts';
import { useCombatLink } from './useCombatLink.ts';
import classes from './CombatScreen.module.css';

export interface CombatScreenProps {
  combatId: CombatId;
  random?: () => number;
  origin?: string;
}

type ActionBody<A extends Action = Action> = A extends Action ? Omit<A, 'id' | 'version'> : never;

type RowPanel = 'initiative' | 'menu' | 'conditions' | 'history' | 'numpad';

interface Panel {
  panel: RowPanel;
  unitId: UnitId;
}

type Form = { mode: 'add' } | { mode: 'edit'; unitId: UnitId };

type Confirm =
  | { kind: 'remove'; unitId: UnitId }
  | { kind: 'restart' }
  | { kind: 'clear' }
  | { kind: 'revoke' };

interface UndoEntry {
  action: UndoableAction;
  unitName?: string;
}

type ToastKind = 'presetAdded' | 'unitRemoved' | 'undone' | 'linkCopied' | 'unitCap';

const toastLooks: Record<ToastKind | 'failed' | 'other', { icon: Icon; tone: ToastTone }> = {
  presetAdded: { icon: IconBookmark, tone: 'success' },
  unitRemoved: { icon: IconUserMinus, tone: 'neutral' },
  undone: { icon: IconArrowBackUp, tone: 'neutral' },
  linkCopied: { icon: IconCheck, tone: 'success' },
  unitCap: { icon: IconAlertTriangle, tone: 'warning' },
  failed: { icon: IconWifiOff, tone: 'error' },
  other: { icon: IconAlertTriangle, tone: 'warning' },
};

const DM = { kind: 'dm' } as const;

const hpActionTypes = {
  damage: 'damage',
  heal: 'heal',
  temp: 'setTempHp',
  max: 'setMaxHp',
} as const satisfies Record<HpHistoryKind, Action['type']>;

const rollOf = (random: () => number): number => {
  const faces = LIMITS.roll.max - LIMITS.roll.min + 1;
  return Math.min(LIMITS.roll.max, LIMITS.roll.min + Math.floor(random() * faces));
};

const roleCountsOf = (units: readonly Unit[]): Record<Role, number> => ({
  hero: units.filter((unit) => unit.role === 'hero').length,
  enemy: units.filter((unit) => unit.role === 'enemy').length,
  ally: units.filter((unit) => unit.role === 'ally').length,
});

const playUrl = (origin: string, combatId: CombatId, token: string): string =>
  `${origin}/combats/${combatId}/play?t=${encodeURIComponent(token)}`;

const defaultOrigin = (): string => globalThis.location?.origin ?? '';

export function CombatScreen({
  combatId,
  random = Math.random,
  origin = defaultOrigin(),
}: CombatScreenProps) {
  const { t } = useTranslation('CombatScreen');
  const { t: tBar } = useTranslation('TurnBar');
  const { t: tEmpty } = useTranslation('EmptyState');
  const { t: tDialog } = useTranslation('Dialog');
  const { t: tToast } = useTranslation('Toast');
  const { t: tRow } = useTranslation('UnitRow');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { combat, error, ended, dispatch } = useCombat(combatId, DM);
  useConnection();
  const { presets, create: createPreset } = usePresets();
  const { tags } = useTags();
  const { toasts, show: showToast, dismiss } = useToasts();
  const [headerOpen, setHeaderOpen] = useState<CombatHeaderPopover | null>(null);
  const [expandedId, setExpandedId] = useState<UnitId | null>(null);
  const [open, setOpen] = useState<Panel | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [flashId, setFlashId] = useState<UnitId | null>(null);
  const [undoCount, setUndoCount] = useState(0);
  const { flashing, flash } = useHpFlash();
  const link = useCombatLink(combatId, shareOpen);
  const undoStack = useRef<UndoEntry[]>([]);
  const toastKinds = useRef(new Map<string, ToastKind>());

  const key = combatKey(combatId, DM);
  const latest = (): Combat | undefined =>
    queryClient.getQueryData<CombatEntry<Combat>>(key)?.document ?? combat;
  const nameOf = (unitId: UnitId): string | undefined =>
    latest()?.units.find((unit) => unit.id === unitId)?.name;

  const setStack = (next: UndoEntry[]) => {
    undoStack.current = next.slice(-LIMITS.undoDepth);
    setUndoCount(undoStack.current.length);
  };

  const remember = (action: Action, unitName: string | undefined) => {
    if (action.type === 'releaseUnit') setStack([]);
    else if (isUndoable(action)) setStack([...undoStack.current, { action, unitName }]);
  };

  const send = async (body: ActionBody): Promise<boolean> => {
    const before = latest();
    if (before === undefined) return false;
    const action = { ...body, id: ulid(), version: before.version } as Action;
    const unitName = 'unitId' in action ? nameOf(action.unitId) : undefined;
    await dispatch(action);
    const ok = (latest()?.version ?? before.version) > before.version;
    if (ok) remember(action, unitName);
    return ok;
  };

  const notify = (kind: ToastKind, message: string, action?: ToastAction) => {
    toastKinds.current.set(message, kind);
    showToast({ message, action });
  };

  const lookOf = (toast: ToastItem) => {
    const kind = toastKinds.current.get(toast.message);
    if (kind) return toastLooks[kind];
    return toast.action ? toastLooks.failed : toastLooks.other;
  };

  const flashUnit = (unitId: UnitId) => {
    setFlashId(unitId);
    flash();
  };

  const undo = async () => {
    const entry = undoStack.current.at(-1);
    if (entry === undefined) return;
    const ok = await send({ type: 'undo' });
    if (!ok) return;
    setStack(undoStack.current.slice(0, -1));
    notify(
      'undone',
      undoLabel(entry.action, {
        t: (labelKey, options) => t(labelKey, options),
        unitName: entry.unitName,
        condition: (condition: Condition) => tRow(condition),
      }),
    );
  };

  const close = () => setOpen(null);
  const show = (panel: RowPanel, unit: Unit) => setOpen({ panel, unitId: unit.id });
  const isOpen = (panel: RowPanel, unit: Unit) => open?.panel === panel && open.unitId === unit.id;

  const reload = () => {
    void queryClient.resetQueries({ queryKey: key });
  };

  const goToCombats = () => {
    void navigate('/combats');
  };

  if (ended?.type === 'deleted') return <CombatNotFound onGoToCombats={goToCombats} />;
  if (combat === undefined) {
    if (error === null) return null;
    if (error instanceof ApiError && error.code === 'notFound') {
      return <CombatNotFound onGoToCombats={goToCombats} />;
    }
    if (error instanceof ApiError && error.code === 'network') {
      return <CantReachServer onRetry={reload} />;
    }
    return <UnexpectedError onReload={reload} />;
  }

  const setup = combat.status === 'setup';
  const units = setup ? combat.units : turnOrder(combat.units);
  const atCap = combat.units.length >= LIMITS.unitsPerCombat;
  const unitById = (unitId: UnitId | undefined) => combat.units.find((unit) => unit.id === unitId);
  const panelUnit = (panel: RowPanel) =>
    open?.panel === panel ? unitById(open.unitId) : undefined;

  const capToast = () => {
    notify('unitCap', tToast('unitCap', { limit: LIMITS.unitsPerCombat }));
  };

  const openAdd = () => {
    if (atCap) {
      capToast();
      return;
    }
    setForm({ mode: 'add' });
  };

  const start = () => {
    const rolls = Object.fromEntries(
      combat.units
        .filter((unit) => unit.initiative === null)
        .map((unit) => [unit.id, rollOf(random)]),
    );
    void send({ type: 'start', rolls });
  };

  const selectMenu = (action: CombatMenuAction) => {
    setHeaderOpen(null);
    if (action === 'addUnit') openAdd();
    else if (action === 'undo') void undo();
    else if (action === 'share') setShareOpen(true);
    else setConfirm({ kind: action });
  };

  const applyHp = async (unit: Unit, kind: HpHistoryKind, amount: number) => {
    close();
    const ok = await send({ type: hpActionTypes[kind], unitId: unit.id, amount });
    if (ok) flashUnit(unit.id);
  };

  const duplicate = async (unit: Unit) => {
    close();
    if (atCap) {
      capToast();
      return;
    }
    const newUnitId = ulid();
    const ok = await send({ type: 'duplicateUnit', unitId: unit.id, newUnitId });
    if (ok) flashUnit(newUnitId);
  };

  const saveAsPreset = (unit: Unit) => {
    close();
    const {
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...input
    } = presetFromUnit(unit, ulid(), new Date().toISOString());
    createPreset(input)
      .then(() => notify('presetAdded', tToast('presetAdded', { name: unit.name })))
      .catch(() => {});
  };

  const changeConditions = (unit: Unit, next: readonly Condition[]) => {
    const condition =
      next.find((value) => !unit.conditions.includes(value)) ??
      unit.conditions.find((value) => !next.includes(value));
    if (condition) void send({ type: 'toggleCondition', unitId: unit.id, condition });
  };

  const submitForm = (draft: UnitDraft) => {
    if (form === null) return;
    setForm(null);
    if (form.mode === 'edit') {
      void send({ ...draft, type: 'editUnit', unitId: form.unitId });
      return;
    }
    if (atCap) {
      capToast();
      return;
    }
    void send({ ...draft, type: 'addUnit', unitId: ulid(), roll: rollOf(random) });
  };

  const removeUnit = async (unit: Unit) => {
    setExpandedId(null);
    const ok = await send({ type: 'removeUnit', unitId: unit.id });
    if (!ok) return;
    notify('unitRemoved', tToast('unitRemoved', { name: unit.name }), {
      label: tToast('undo'),
      onAction: () => {
        void undo();
      },
    });
  };

  const copyLink = async (url: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return false;
    }
    notify('linkCopied', tToast('linkCopied'));
    return true;
  };

  const reissue = () => {
    link
      .reissue()
      .then(() => setStack([]))
      .catch(() => {});
  };

  const confirmed = (current: Confirm) => {
    setConfirm(null);
    if (current.kind === 'remove') {
      const unit = unitById(current.unitId);
      if (unit) void removeUnit(unit);
    } else if (current.kind === 'revoke') {
      reissue();
    } else {
      setExpandedId(null);
      void send({ type: current.kind });
    }
  };

  const reason = setup ? null : nextTurnBlockReason(combat);
  const target = setup ? null : nextTurnTarget(combat);
  const targetName = unitById(target?.unitId)?.name;
  const nextName =
    target && targetName
      ? target.wraps
        ? t('nextWrap', { name: targetName, round: combat.round + 1 })
        : targetName
      : undefined;
  const blockedReason = setup
    ? tBar('addUnitFirst')
    : reason === 'lastRound'
      ? tBar('lastRound', { round: LIMITS.round.max })
      : tBar('everyUnitDisabled');

  const removing = confirm?.kind === 'remove' ? unitById(confirm.unitId) : undefined;
  const dialogs: Record<Confirm['kind'], Omit<DialogProps, 'opened' | 'onConfirm' | 'onCancel'>> = {
    remove: {
      icon: IconUserMinus,
      title: tDialog('removeTitle', { name: removing?.name ?? '' }),
      body: tDialog('removeBody'),
      confirmLabel: tDialog('remove'),
    },
    restart: {
      icon: IconRefresh,
      tone: 'ink',
      title: tDialog('restartTitle'),
      body: tDialog('restartBody'),
      confirmLabel: tDialog('restart'),
    },
    clear: {
      icon: IconTrash,
      title: tDialog('clearTitle'),
      body: tDialog('clearBody', { count: combat.units.length }),
      confirmLabel: tDialog('clear'),
    },
    revoke: {
      icon: IconLinkOff,
      title: tDialog('revokeTitle'),
      body: tDialog('revokeBody'),
      confirmLabel: tDialog('revoke'),
    },
  };
  const dialog = dialogs[confirm?.kind ?? 'remove'];

  const numpadUnit = panelUnit('numpad');
  const conditionsUnit = panelUnit('conditions');
  const historyUnit = panelUnit('history');
  const editing = form?.mode === 'edit' ? unitById(form.unitId) : undefined;
  const toast = toasts[0];

  return (
    <div className={classes.root}>
      <CombatHeader
        title={combat.title}
        round={setup ? null : combat.round}
        escalation={combat.escalation as EscalationValue}
        open={headerOpen}
        undoDisabled={undoCount === 0}
        onBack={goToCombats}
        onRound={() => setHeaderOpen('round')}
        onEscalation={() => setHeaderOpen('escalation')}
        onMenu={() => setHeaderOpen((current) => (current === 'menu' ? null : 'menu'))}
        onClose={() => setHeaderOpen(null)}
        onRoundChange={(round) => {
          if (round !== latest()?.round) void send({ type: 'editRound', round });
        }}
        onEscalationChange={(escalation) => {
          if (escalation !== combat.escalation) void send({ type: 'setEscalation', escalation });
        }}
        onMenuSelect={selectMenu}
      />
      <div className={classes.list}>
        {units.map((unit) => (
          <UnitRow
            key={unit.id}
            className={classes.row}
            unit={unit}
            claimedByName={unit.claimedBy === null ? undefined : combat.players[unit.claimedBy]}
            active={!setup && combat.activeUnitId === unit.id}
            expanded={expandedId === unit.id}
            flash={flashing && flashId === unit.id}
            initiativeOpen={isOpen('initiative', unit)}
            conditionsOpen={isOpen('conditions', unit)}
            historyOpen={isOpen('history', unit)}
            menuOpen={isOpen('menu', unit)}
            random={random}
            onToggle={() => {
              close();
              setExpandedId((current) => (current === unit.id ? null : unit.id));
            }}
            onInitiative={() => show('initiative', unit)}
            onInitiativeSet={(initiative) => {
              void send({ type: 'setInitiative', unitId: unit.id, initiative });
            }}
            onInitiativeRoll={(_initiative, roll) => {
              close();
              void send({ type: 'rollInitiative', unitId: unit.id, roll });
            }}
            onInitiativeClose={close}
            onHp={() => show('numpad', unit)}
            onConditions={() => show('conditions', unit)}
            onHistory={() => show('history', unit)}
            onNoteChange={(note) => {
              if (note !== unit.note) void send({ type: 'editNote', unitId: unit.id, note });
            }}
            onEdit={() => {
              close();
              setForm({ mode: 'edit', unitId: unit.id });
            }}
            onMore={() => (isOpen('menu', unit) ? close() : show('menu', unit))}
            onMenuClose={close}
            onDuplicate={() => {
              void duplicate(unit);
            }}
            onSetDisabled={(disabled) => {
              close();
              void send({ type: 'setDisabled', unitId: unit.id, disabled });
            }}
            onSaveAsPreset={() => saveAsPreset(unit)}
            onReleaseClaim={() => {
              close();
              void send({ type: 'releaseUnit', unitId: unit.id });
            }}
            onRemove={() => {
              close();
              setConfirm({ kind: 'remove', unitId: unit.id });
            }}
          />
        ))}
        {combat.units.length === 0 ? (
          <EmptyState
            icon={IconUsers}
            title={tEmpty('noUnitsTitle')}
            body={tEmpty('noUnitsBody')}
            action={{ label: tEmpty('addUnit'), icon: IconUserPlus, onAction: openAdd }}
          />
        ) : null}
      </div>
      <TurnBar
        mode={setup ? 'start' : 'next'}
        nextName={nextName}
        disabled={setup ? combat.units.length === 0 : reason !== null}
        reason={blockedReason}
        onClick={() => {
          if (setup) start();
          else void send({ type: 'nextTurn' });
        }}
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
      {numpadUnit ? (
        <NumpadSheet
          opened
          name={numpadUnit.name}
          role={numpadUnit.role}
          initiative={numpadUnit.initiative}
          hp={numpadUnit.hp}
          maxHp={numpadUnit.maxHp}
          tempHp={numpadUnit.tempHp}
          history={numpadUnit.hpHistory.toReversed()}
          onApply={(kind, amount) => {
            void applyHp(numpadUnit, kind, amount);
          }}
          onClose={close}
        />
      ) : null}
      {conditionsUnit ? (
        <ConditionPicker
          opened
          unitName={conditionsUnit.name}
          value={conditionsUnit.conditions}
          onChange={(next) => changeConditions(conditionsUnit, next)}
          onClose={close}
        />
      ) : null}
      {historyUnit ? (
        <HpHistory
          variant="sheet"
          opened
          unitName={historyUnit.name}
          entries={historyUnit.hpHistory.toReversed()}
          maxHp={historyUnit.maxHp}
          onClose={close}
        />
      ) : null}
      {form?.mode === 'add' ? (
        <UnitForm
          opened
          mode="add"
          presets={presets ?? []}
          tags={(tags ?? []).map((tag) => ({
            id: tag.id,
            name: tag.name,
            count: (presets ?? []).filter((preset) => preset.tags.includes(tag.id)).length,
          }))}
          combatTitle={combat.title}
          roleCounts={roleCountsOf(combat.units)}
          hint={setup ? 'setup' : 'active'}
          onSubmit={submitForm}
          onCancel={() => setForm(null)}
        />
      ) : null}
      {editing ? (
        <UnitForm
          opened
          mode="edit"
          value={{
            name: editing.name,
            role: editing.role,
            maxHp: editing.maxHp,
            tempHp: editing.tempHp,
            ac: editing.ac,
            pd: editing.pd,
            md: editing.md,
            initiativeBonus: editing.initiativeBonus,
            note: editing.note,
          }}
          onSubmit={submitForm}
          onCancel={() => setForm(null)}
        />
      ) : null}
      <ShareSheet
        opened={shareOpen && link.token !== undefined}
        combatTitle={combat.title}
        url={link.token === undefined ? '' : playUrl(origin, combatId, link.token)}
        onCopy={copyLink}
        onReissue={() => setConfirm({ kind: 'revoke' })}
        onClose={() => setShareOpen(false)}
      />
      <Dialog
        opened={confirm !== null && (confirm.kind !== 'remove' || removing !== undefined)}
        {...dialog}
        onConfirm={() => {
          if (confirm) confirmed(confirm);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
