import { ApiError } from '@combat-planner/api/client';
import type { DmCombat, PresenceEvent } from '@combat-planner/api/client';
import {
  LIMITS,
  healthStatus,
  nextTurnBlockReason,
  nextTurnTarget,
  presetFromUnit,
  turnOrder,
} from '@combat-planner/domain';
import type {
  Action,
  CombatId,
  Condition,
  HpHistoryKind,
  UndoSummary,
  Unit,
  UnitId,
} from '@combat-planner/domain';
import {
  IconEyeOff,
  IconLinkOff,
  IconRefresh,
  IconTrash,
  IconUserMinus,
  IconUserPlus,
  IconUsers,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ulid } from 'ulid';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import { combatKey } from '../../hooks/combat.ts';
import type { CombatEntry } from '../../hooks/combat.ts';
import { overlay } from '../../hooks/optimistic.ts';
import { createSendQueue } from '../../hooks/sendQueue.ts';
import type { ToastAction, ToastKind } from '../../hooks/toasts.ts';
import { useAccount } from '../../hooks/useAccount.ts';
import { useCombat } from '../../hooks/useCombat.ts';
import { useCombatLink } from '../../hooks/useCombatLink.ts';
import { useConnection } from '../../hooks/useConnection.ts';
import { useHpChanges } from '../../hooks/useHpChanges.ts';
import { usePresets } from '../../hooks/usePresets.ts';
import { useRetained } from '../../hooks/useRetained.ts';
import { useTags } from '../../hooks/useTags.ts';
import { useToasts } from '../../hooks/useToasts.ts';
import { useWakeLock } from '../../hooks/useWakeLock.ts';
import { AddTile } from '../../molecules/AddTile/AddTile.tsx';
import { EmptyState } from '../../molecules/EmptyState/EmptyState.tsx';
import { ScrollList } from '../../molecules/ScrollList/ScrollList.tsx';
import { Toast } from '../../molecules/Toast/Toast.tsx';
import { TurnBracket } from '../../molecules/TurnBracket/TurnBracket.tsx';
import { CombatHeader } from '../../organisms/CombatHeader/CombatHeader.tsx';
import type {
  CombatHeaderPanel,
  CombatMenuAction,
} from '../../organisms/CombatHeader/CombatHeader.tsx';
import { ConditionPicker } from '../../organisms/ConditionPicker/ConditionPicker.tsx';
import { DefenseSheet } from '../../organisms/DefenseSheet/DefenseSheet.tsx';
import { Dialog } from '../../organisms/Dialog/Dialog.tsx';
import type { DialogProps } from '../../organisms/Dialog/Dialog.tsx';
import { HpHistory } from '../../organisms/HpHistory/HpHistory.tsx';
import { InitiativeSheet } from '../../organisms/InitiativeSheet/InitiativeSheet.tsx';
import { NumpadSheet } from '../../organisms/NumpadSheet/NumpadSheet.tsx';
import { RoundSheet } from '../../organisms/RoundSheet/RoundSheet.tsx';
import { ShareSheet } from '../../organisms/ShareSheet/ShareSheet.tsx';
import { TurnBar } from '../../organisms/TurnBar/TurnBar.tsx';
import { UnitForm } from '../../organisms/UnitForm/UnitForm.tsx';
import type { UnitDraft } from '../../organisms/UnitForm/UnitForm.tsx';
import { UnitRow } from '../../organisms/UnitRow/UnitRow.tsx';
import { CantReachServer } from '../CantReachServer/CantReachServer.tsx';
import { CombatNotFound } from '../CombatNotFound/CombatNotFound.tsx';
import { UnexpectedError } from '../UnexpectedError/UnexpectedError.tsx';
import { saveCombatFile } from '../shared/combatFile.ts';
import { LoadingScreen } from '../shared/LoadingScreen.tsx';
import { StatusStrip } from '../shared/StatusStrip.tsx';
import { toastLook } from '../shared/toastLook.ts';
import { claimEvents } from './claimEvents.ts';
import { isUndoable, undoLabel } from './undoLabel.ts';
import classes from './CombatScreen.module.css';

export interface CombatScreenProps {
  combatId: CombatId;
  random?: () => number;
  origin?: string;
}

type ActionBody<A extends Action = Action> = A extends Action ? Omit<A, 'id' | 'version'> : never;

interface Sent {
  action: Action;
  version: number;
}

interface PinnedUndo {
  summary: UndoSummary;
  version: number;
}

type RowPanel = 'initiative' | 'menu' | 'conditions' | 'defenses' | 'history' | 'numpad';

interface Panel {
  panel: RowPanel;
  unitId: UnitId;
}

type Form = { mode: 'add' } | { mode: 'edit'; unitId: UnitId };

type Confirm =
  | { kind: 'remove'; unitId: UnitId }
  | { kind: 'restart' }
  | { kind: 'clear' }
  | { kind: 'revoke' }
  | { kind: 'stop' };

const DM = { kind: 'dm' } as const;

const settleOwnReleases = (marks: Map<UnitId, number>, before: DmCombat, after: DmCombat) => {
  const claims = new Map(before.units.map((unit) => [unit.id, unit.claimedBy]));
  for (const unit of after.units) {
    if (claims.has(unit.id) && claims.get(unit.id) !== unit.claimedBy) marks.delete(unit.id);
  }
  for (const [unitId, until] of marks) if (until <= after.version) marks.delete(unitId);
};

const toastedCodes: ReadonlySet<string> = new Set(['network', 'version', 'limit', 'rateLimited']);

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
  const { toasts, show: showToast, dismiss } = useToasts();
  const presence = useRef<{ pending: string[]; showing: boolean }>({
    pending: [],
    showing: false,
  });
  const announce = useCallback(
    (message: string) => {
      const queue = presence.current;
      queue.pending.push(message);
      if (queue.showing) return;
      const showNext = () => {
        const next = queue.pending.shift();
        queue.showing = next !== undefined;
        if (next !== undefined) showToast({ message: next, kind: 'neutral', onDismiss: showNext });
      };
      showNext();
    },
    [showToast],
  );
  const onPresence = (event: PresenceEvent) => {
    announce(
      event.type === 'playerJoined'
        ? tToast('playerJoined')
        : tToast('playerLeft', { name: event.name }),
    );
  };
  const {
    combat: server,
    error,
    ended,
    dispatch,
    refetch,
    pending,
    tracker,
  } = useCombat(combatId, DM, { onPresence });
  const combat = useMemo(() => server && overlay(server, pending, DM), [server, pending]);
  useConnection();
  useWakeLock(server !== undefined && ended === null);
  const { presets, create: createPreset } = usePresets();
  const { tags } = useTags();
  const [headerOpen, setHeaderOpen] = useState<CombatHeaderPanel | null>(null);
  const [expandedId, setExpandedId] = useState<UnitId | null>(null);
  const [open, setOpen] = useState<Panel | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [busyUnitId, setBusyUnitId] = useState<UnitId | null>(null);
  const [undoing, setUndoing] = useState(false);
  const link = useCombatLink(combatId, shareOpen);
  const knownVersion = useRef(0);
  const previous = useRef<DmCombat | undefined>(undefined);
  const ownReleases = useRef(new Map<UnitId, number>());
  const [enqueue] = useState(createSendQueue);
  const { session } = useAccount();
  const signedOut =
    session === null ||
    ended?.type === 'unauthorized' ||
    (error instanceof ApiError && error.code === 'unauthorized');
  const linkFailed = shareOpen && link.error !== null;

  useEffect(() => {
    if (signedOut) void navigate('/auth/sign-in');
  }, [signedOut, navigate]);

  useEffect(() => {
    if (!linkFailed) return;
    setShareOpen(false);
    showToast({ message: t('linkFailed'), kind: 'error' });
  }, [linkFailed, showToast, t]);

  useEffect(
    () => () => {
      presence.current.pending = [];
    },
    [],
  );

  useEffect(() => {
    const before = previous.current;
    previous.current = server;
    if (before === undefined || server === undefined || before === server) return;
    for (const event of claimEvents(before, server)) {
      if (event.kind === 'released' && ownReleases.current.has(event.unitId)) continue;
      announce(
        tToast(event.kind === 'claimed' ? 'playerClaimed' : 'playerReleased', {
          name: event.player,
          hero: event.hero,
        }),
      );
    }
    settleOwnReleases(ownReleases.current, before, server);
  }, [server, announce, tToast]);

  const key = combatKey(combatId, DM);
  const latest = (): DmCombat | undefined =>
    queryClient.getQueryData<CombatEntry<DmCombat>>(key)?.document ?? server;

  const sendNow = async (
    body: ActionBody,
    release: () => void,
    pinnedVersion?: number,
    id: string = ulid(),
  ): Promise<Sent | null> => {
    const before = latest();
    if (before === undefined) {
      tracker.drop(id);
      return null;
    }
    const version = pinnedVersion ?? Math.max(before.version, knownVersion.current);
    const action = { ...body, id, version } as Action;
    const result = await dispatch(action, release);
    if (!result.applied) return null;
    knownVersion.current = Math.max(knownVersion.current, result.version);
    return { action, version: result.version };
  };

  const send = (body: ActionBody): Promise<Sent | null> => {
    const id = ulid();
    const queued = { ...body, id, version: 0 } as Action;
    if (tracker.optimistic(queued)) tracker.add(queued);
    return enqueue((release) => sendNow(body, release, undefined, id));
  };

  const notify = (message: string, kind: ToastKind, action?: ToastAction) => {
    showToast({ message, kind, action });
  };

  const undoMessage = (summary: UndoSummary): string | null => {
    if (!isUndoable(summary.action)) return null;
    return undoLabel(summary.action, {
      t: (labelKey, options) => t(labelKey, options),
      unitName: summary.unitName ?? undefined,
      condition: (condition: Condition) => tRow(condition),
    });
  };

  const releaseAsDm = async (unitIds: readonly UnitId[], run: () => Promise<number | boolean>) => {
    const marks = ownReleases.current;
    for (const unitId of unitIds) marks.set(unitId, Number.POSITIVE_INFINITY);
    const outcome = await run();
    const seen = previous.current?.version ?? 0;
    for (const unitId of unitIds) {
      if (marks.get(unitId) !== Number.POSITIVE_INFINITY || outcome === true) continue;
      if (outcome === false || outcome <= seen) marks.delete(unitId);
      else marks.set(unitId, outcome);
    }
  };

  const undo = (pinned?: PinnedUndo) =>
    enqueue(async (release) => {
      const summary = pinned?.summary ?? latest()?.undo;
      if (!summary) return;
      const message = undoMessage(summary);
      setUndoing(true);
      try {
        const undone = await sendNow({ type: 'undo' }, release, pinned?.version);
        if (undone && message !== null) notify(message, 'neutral');
      } finally {
        setUndoing(false);
      }
    });

  const close = () => setOpen(null);
  const show = (panel: RowPanel, unit: Unit) => setOpen({ panel, unitId: unit.id });
  const isOpen = (panel: RowPanel, unit: Unit) => open?.panel === panel && open.unitId === unit.id;

  const reload = () => {
    void refetch();
  };

  const goToCombats = () => {
    void navigate('/combats');
  };

  const hpChanges = useHpChanges(
    (combat?.units ?? []).map((unit) => ({
      id: unit.id,
      hp: unit.hp,
      tempHp: unit.tempHp,
      healthStatus: healthStatus(unit.hp, unit.maxHp, unit.role),
    })),
  );

  const goHome = () => {
    void navigate('/');
  };

  const panelUnit = (panel: RowPanel) =>
    (open?.panel === panel ? combat?.units.find((unit) => unit.id === open.unitId) : undefined) ??
    null;
  const initiativeOpen = panelUnit('initiative');
  const numpadOpen = panelUnit('numpad');
  const conditionsOpen = panelUnit('conditions');
  const historyOpen = panelUnit('history');
  const defensesOpen = panelUnit('defenses');
  const editingOpen =
    (form?.mode === 'edit' ? combat?.units.find((unit) => unit.id === form.unitId) : undefined) ??
    null;
  const addingOpen = form?.mode === 'add' ? form : null;
  const initiativeUnit = useRetained(initiativeOpen);
  const numpadUnit = useRetained(numpadOpen);
  const conditionsUnit = useRetained(conditionsOpen);
  const historyUnit = useRetained(historyOpen);
  const defensesUnit = useRetained(defensesOpen);
  const editing = useRetained(editingOpen);
  const adding = useRetained(addingOpen);

  if (ended?.type === 'deleted') return <CombatNotFound onHome={goHome} />;
  if (combat === undefined) {
    if (signedOut) return null;
    if (error === null) return <LoadingScreen onBack={goToCombats} />;
    if (error instanceof ApiError && error.code === 'notFound') {
      return <CombatNotFound onHome={goHome} />;
    }
    if (error instanceof ApiError && error.code === 'network') {
      return <CantReachServer onRetry={reload} onHome={goHome} />;
    }
    return <UnexpectedError onReload={reload} onHome={goHome} />;
  }

  const setup = combat.status === 'setup';
  const units = setup ? combat.units : turnOrder(combat.units);
  const atCap = combat.units.length >= LIMITS.unitsPerCombat;
  const unitById = (unitId: UnitId | undefined) => combat.units.find((unit) => unit.id === unitId);
  const openForm = (next: Form) => {
    setFormKey((current) => current + 1);
    setForm(next);
  };

  const capToast = () => {
    notify(tToast('unitCap', { limit: LIMITS.unitsPerCombat }), 'warning');
  };

  const openAdd = () => {
    if (atCap) {
      capToast();
      return;
    }
    openForm({ mode: 'add' });
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
    else if (action === 'export') saveCombatFile(combat).catch(() => {});
    else setConfirm({ kind: action });
  };

  const applyHp = (unit: Unit, kind: HpHistoryKind, amount: number) => {
    close();
    void send({ type: hpActionTypes[kind], unitId: unit.id, amount });
  };

  const duplicate = (unit: Unit) => {
    close();
    const newUnitId = ulid();
    void send({ type: 'duplicateUnit', unitId: unit.id, newUnitId });
  };

  const saveAsPreset = (unit: Unit) => {
    close();
    setBusyUnitId(unit.id);
    const {
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...input
    } = presetFromUnit(unit, ulid(), new Date().toISOString());
    createPreset(input)
      .then(() => notify(tToast('presetAdded', { name: unit.name }), 'success'))
      .catch((error: unknown) => {
        if (error instanceof ApiError && toastedCodes.has(error.code)) return;
        notify(t('presetFailed'), 'error');
      })
      .finally(() => setBusyUnitId(null));
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
      const { unitId } = form;
      const edit = () => send({ ...draft, type: 'editUnit', unitId });
      if (draft.role !== 'hero' && unitById(unitId)?.claimedBy) {
        void releaseAsDm([unitId], async () => (await edit())?.version ?? false);
      } else {
        void edit();
      }
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
    const removal = await send({ type: 'removeUnit', unitId: unit.id });
    if (!removal) return;
    notify(tToast('unitRemoved', { name: unit.name }), 'neutral', {
      label: tToast('undo'),
      onAction: () => {
        void undo({
          summary: { action: removal.action, unitName: unit.name },
          version: removal.version,
        });
      },
    });
  };

  const copyLink = async (url: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return false;
    }
    setShareOpen(false);
    notify(tToast('linkCopied'), 'success');
    return true;
  };

  const releaseEveryClaim = (run: () => Promise<unknown>) => {
    const claimed = combat.units.filter((unit) => unit.claimedBy !== null).map((unit) => unit.id);
    void releaseAsDm(claimed, () =>
      run().then(
        () => true,
        () => false,
      ),
    );
  };

  const confirmed = (current: Confirm) => {
    setConfirm(null);
    if (current.kind === 'remove') {
      const unit = unitById(current.unitId);
      if (unit) void removeUnit(unit);
    } else if (current.kind === 'revoke') {
      releaseEveryClaim(link.reissue);
    } else if (current.kind === 'stop') {
      setShareOpen(false);
      releaseEveryClaim(link.stop);
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
    stop: {
      icon: IconEyeOff,
      title: tDialog('stopTitle'),
      body: tDialog('stopBody'),
      confirmLabel: tDialog('stop'),
    },
  };
  const dialog = dialogs[confirm?.kind ?? 'remove'];

  const toast = toasts[0];

  return (
    <div className={classes.root}>
      <StatusStrip />
      <ScrollList className={classes.list} contentClassName={classes.scrollContent}>
        <CombatHeader
          title={combat.title}
          round={setup ? null : combat.round}
          escalation={combat.escalation as EscalationValue}
          open={headerOpen}
          undoDisabled={!combat.undo || pending.length > 0}
          busy={undoing || (shareOpen && link.token === undefined && !linkFailed)}
          onBack={goToCombats}
          onRound={() => setHeaderOpen('round')}
          onMenu={() => setHeaderOpen((current) => (current === 'menu' ? null : 'menu'))}
          onClose={() => setHeaderOpen(null)}
          onMenuSelect={selectMenu}
          statusBar={false}
        />
        <div className={classes.listContent}>
          <TurnBracket activeId={setup ? null : combat.activeUnitId} />
          {units.map((unit) => (
            <UnitRow
              key={unit.id}
              className={classes.row}
              data-unit-id={unit.id}
              unit={unit}
              claimedByName={unit.claimedBy === null ? undefined : combat.players[unit.claimedBy]}
              active={!setup && combat.activeUnitId === unit.id}
              expanded={expandedId === unit.id}
              hpChange={hpChanges.get(unit.id)}
              initiativeOpen={isOpen('initiative', unit)}
              conditionsOpen={isOpen('conditions', unit)}
              historyOpen={isOpen('history', unit)}
              defensesOpen={isOpen('defenses', unit)}
              menuOpen={isOpen('menu', unit)}
              busy={busyUnitId === unit.id}
              duplicateDisabled={atCap}
              onToggle={() => {
                close();
                setExpandedId((current) => (current === unit.id ? null : unit.id));
              }}
              onInitiative={() => show('initiative', unit)}
              onHp={() => show('numpad', unit)}
              onConditions={() => show('conditions', unit)}
              onDefenses={() => show('defenses', unit)}
              onHistory={() => show('history', unit)}
              onNoteChange={(note) => {
                if (note !== unit.note) void send({ type: 'editNote', unitId: unit.id, note });
              }}
              onEdit={() => {
                close();
                openForm({ mode: 'edit', unitId: unit.id });
              }}
              onMore={() => (isOpen('menu', unit) ? close() : show('menu', unit))}
              onMenuClose={close}
              onDuplicate={() => duplicate(unit)}
              onSetDisabled={(disabled) => {
                close();
                if (disabled) setExpandedId(null);
                void send({ type: 'setDisabled', unitId: unit.id, disabled });
              }}
              onSaveAsPreset={() => saveAsPreset(unit)}
              onReleaseClaim={() => {
                close();
                setBusyUnitId(unit.id);
                void releaseAsDm(
                  [unit.id],
                  async () =>
                    (await send({ type: 'releaseUnit', unitId: unit.id }))?.version ?? false,
                ).finally(() => setBusyUnitId(null));
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
            />
          ) : null}
          {setup ? (
            <AddTile
              label={tEmpty('addUnit')}
              icon={IconUserPlus}
              disabled={atCap}
              hint={atCap ? tToast('unitCap', { limit: LIMITS.unitsPerCombat }) : undefined}
              onClick={openAdd}
            />
          ) : null}
        </div>
      </ScrollList>
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
          {...toastLook(toast.kind)}
          message={toast.message}
          action={toast.action}
          duration={toast.duration}
          onHide={() => dismiss(toast.id)}
        />
      ) : null}
      <RoundSheet
        opened={!setup && headerOpen === 'round'}
        combatTitle={combat.title}
        round={combat.round}
        escalation={combat.escalation as EscalationValue}
        onRoundChange={(round) => {
          if (round !== latest()?.round) void send({ type: 'editRound', round });
        }}
        onEscalationChange={(escalation) => {
          if (escalation !== combat.escalation) void send({ type: 'setEscalation', escalation });
        }}
        onClose={() => setHeaderOpen(null)}
      />
      {initiativeUnit ? (
        <InitiativeSheet
          key={`initiative-${initiativeUnit.id}`}
          opened={initiativeOpen !== null}
          unitName={initiativeUnit.name}
          value={initiativeUnit.initiative}
          bonus={initiativeUnit.initiativeBonus}
          random={random}
          onSet={(initiative) => {
            void send({ type: 'setInitiative', unitId: initiativeUnit.id, initiative });
          }}
          onRoll={(_initiative, roll) => {
            close();
            void send({ type: 'rollInitiative', unitId: initiativeUnit.id, roll });
          }}
          onClose={close}
        />
      ) : null}
      {numpadUnit ? (
        <NumpadSheet
          key={`numpad-${numpadUnit.id}`}
          opened={numpadOpen !== null}
          name={numpadUnit.name}
          role={numpadUnit.role}
          initiative={numpadUnit.initiative}
          hp={numpadUnit.hp}
          maxHp={numpadUnit.maxHp}
          tempHp={numpadUnit.tempHp}
          history={numpadUnit.hpHistory.toReversed()}
          onApply={(kind, amount) => applyHp(numpadUnit, kind, amount)}
          onClose={close}
        />
      ) : null}
      {conditionsUnit ? (
        <ConditionPicker
          key={`conditions-${conditionsUnit.id}`}
          opened={conditionsOpen !== null}
          unitName={conditionsUnit.name}
          value={conditionsUnit.conditions}
          onChange={(next) => changeConditions(conditionsUnit, next)}
          onClose={close}
        />
      ) : null}
      {defensesUnit ? (
        <DefenseSheet
          key={`defenses-${defensesUnit.id}`}
          opened={defensesOpen !== null}
          unitName={defensesUnit.name}
          base={{ ac: defensesUnit.ac, pd: defensesUnit.pd, md: defensesUnit.md }}
          mods={{ ac: defensesUnit.acMod, pd: defensesUnit.pdMod, md: defensesUnit.mdMod }}
          onChange={(mods) => {
            void send({ type: 'setDefenseMods', unitId: defensesUnit.id, ...mods });
          }}
          onClose={close}
        />
      ) : null}
      {historyUnit ? (
        <HpHistory
          key={`history-${historyUnit.id}`}
          variant="sheet"
          opened={historyOpen !== null}
          unitName={historyUnit.name}
          entries={historyUnit.hpHistory.toReversed()}
          maxHp={historyUnit.maxHp}
          onClose={close}
        />
      ) : null}
      {adding ? (
        <UnitForm
          key={`add-${formKey}`}
          opened={addingOpen !== null}
          mode="add"
          presets={presets ?? []}
          tags={(tags ?? []).map((tag) => ({
            id: tag.id,
            name: tag.name,
            count: (presets ?? []).filter((preset) => preset.tags.includes(tag.id)).length,
          }))}
          combatTitle={combat.title}
          unitNames={combat.units.map((unit) => unit.name)}
          hint={setup ? 'setup' : 'active'}
          onSubmit={submitForm}
          onCancel={() => setForm(null)}
        />
      ) : null}
      {editing ? (
        <UnitForm
          key={`edit-${formKey}`}
          opened={editingOpen !== null}
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
        onStop={() => setConfirm({ kind: 'stop' })}
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
