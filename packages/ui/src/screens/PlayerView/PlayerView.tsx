import { ApiError } from '@combat-planner/api/client';
import type { LinkToken } from '@combat-planner/api/client';
import type { Action, CombatId, PlayerCombat, UnitId } from '@combat-planner/domain';
import { IconLogout } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../api/ApiProvider.tsx';
import { combatKey } from '../../hooks/combat.ts';
import type { CombatEntry } from '../../hooks/combat.ts';
import { overlay } from '../../hooks/optimistic.ts';
import { createSendQueue } from '../../hooks/sendQueue.ts';
import { errorToast } from '../../hooks/toasts.ts';
import { useCombat } from '../../hooks/useCombat.ts';
import { useLocaleChoice } from '../../hooks/useLocaleChoice.ts';
import { useToasts } from '../../hooks/useToasts.ts';
import { Dialog } from '../../organisms/Dialog/Dialog.tsx';
import { CantReachServer } from '../CantReachServer/CantReachServer.tsx';
import { CombatDeleted } from '../CombatDeleted/CombatDeleted.tsx';
import { Heroes } from '../Heroes/Heroes.tsx';
import { LinkExpired } from '../LinkExpired/LinkExpired.tsx';
import { LoadingScreen } from '../shared/LoadingScreen.tsx';
import { TurnOrder } from '../TurnOrder/TurnOrder.tsx';
import { UnexpectedError } from '../UnexpectedError/UnexpectedError.tsx';
import { ownTurnStarted, vibrateOwnTurn } from './ownTurn.ts';
import { usePlayerToasts } from './PlayerToast.tsx';
import { playerEvents } from './playerEvents.ts';
import classes from './PlayerView.module.css';

export interface PlayerViewProps {
  combatId: CombatId;
  token: LinkToken;
  random?: () => number;
  onHome: () => void;
}

type View = 'heroes' | 'turnOrder';

const PLAYER = { kind: 'player' } as const;

const holdsHero = (combat: PlayerCombat): boolean =>
  combat.units.some((unit) => unit.mine === true);

export function PlayerView({ combatId, token, random, onHome }: PlayerViewProps) {
  const {
    combat: server,
    language,
    error,
    ended,
    dispatch,
    refetch,
    pending,
    tracker,
  } = useCombat(combatId, PLAYER, token);
  const queryClient = useQueryClient();
  const combat = useMemo(() => server && overlay(server, pending, PLAYER), [server, pending]);
  const { i18n } = useTranslation();
  const { chosen } = useLocaleChoice();
  const { t: tDialog } = useTranslation('Dialog');
  const api = useApi();
  const { show, t: tToast } = useToasts();
  const notify = usePlayerToasts();
  const [view, setView] = useState<View | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [departing, setDeparting] = useState(false);
  const [seenTitle, setSeenTitle] = useState<string | null>(null);
  const ownReleases = useRef(new Set<UnitId>());
  const knownVersion = useRef(0);
  const [enqueue] = useState(createSendQueue);
  const previous = useRef<PlayerCombat | undefined>(undefined);

  if (combat && view === null) setView(holdsHero(combat) ? 'turnOrder' : 'heroes');
  if (combat && combat.title !== seenTitle) setSeenTitle(combat.title);

  useLayoutEffect(() => {
    const shown = chosen() ?? language;
    if (shown !== null && i18n.language !== shown) void i18n.changeLanguage(shown);
  }, [language, i18n, chosen]);

  useEffect(() => {
    const before = previous.current;
    previous.current = server;
    if (before === undefined || server === undefined || before === server) return;
    let lostHero = false;
    for (const event of playerEvents(before, server)) {
      if (event.kind === 'released' && ownReleases.current.delete(event.unitId)) {
        lostHero = true;
        continue;
      }
      if (event.kind === 'released' || event.kind === 'removed') lostHero = true;
      notify(event);
    }
    if (lostHero && !holdsHero(server)) setView('heroes');
    if (ownTurnStarted(before, server)) vibrateOwnTurn();
  }, [server, notify]);

  const send = useCallback(
    async (action: Action) => {
      const ownRelease = action.type === 'releaseUnit' ? action.unitId : null;
      if (ownRelease !== null) ownReleases.current.add(ownRelease);
      if (tracker.optimistic(action)) tracker.add(action);
      const result = await enqueue(async (release) => {
        const cached = queryClient.getQueryData<CombatEntry<PlayerCombat>>(
          combatKey(combatId, PLAYER),
        )?.document.version;
        const version = Math.max(action.version, cached ?? 0, knownVersion.current);
        const sent = await dispatch({ ...action, version }, release);
        if (sent.applied) knownVersion.current = Math.max(knownVersion.current, sent.version);
        return sent;
      });
      if (ownRelease !== null && !result.applied) ownReleases.current.delete(ownRelease);
      return result;
    },
    [dispatch, tracker, enqueue, queryClient, combatId],
  );

  const reload = () => {
    void refetch();
  };

  const leave = () => {
    setDeparting(true);
    void api.play.leave(combatId).then(
      () => onHome(),
      (failure: unknown) => {
        setDeparting(false);
        setLeaving(false);
        show(
          errorToast(failure, tToast, 'serverUnreachableNothingChanged', leave) ?? {
            message: tToast('serverUnreachableNothingChanged'),
            kind: 'error',
          },
        );
      },
    );
  };

  if (ended?.type === 'linkRevoked') return <LinkExpired onHome={onHome} />;
  if (ended?.type === 'dropped') return <CantReachServer onRetry={reload} onHome={onHome} />;
  if (ended?.type === 'deleted') {
    return (
      <CombatDeleted combatTitle={ended.title || (combat?.title ?? seenTitle)} onHome={onHome} />
    );
  }
  if (combat === undefined) {
    if (error === null) return <LoadingScreen />;
    if (error instanceof ApiError && error.code === 'linkRevoked')
      return <LinkExpired onHome={onHome} />;
    if (error instanceof ApiError && error.code === 'notFound') {
      return <CombatDeleted combatTitle={seenTitle} onHome={onHome} />;
    }
    if (error instanceof ApiError && (error.code === 'network' || error.code === 'limit')) {
      return <CantReachServer onRetry={reload} onHome={onHome} />;
    }
    return <UnexpectedError onReload={reload} onHome={onHome} />;
  }

  return (
    <div className={classes.root}>
      {view === 'heroes' ? (
        <Heroes combat={combat} dispatch={send} onDone={() => setView('turnOrder')} />
      ) : (
        <TurnOrder
          combat={combat}
          dispatch={send}
          random={random}
          onHeroes={() => setView('heroes')}
          onLeave={() => setLeaving(true)}
        />
      )}
      <Dialog
        opened={leaving}
        icon={IconLogout}
        title={tDialog('leaveTitle')}
        body={tDialog('leaveBody')}
        confirmLabel={tDialog('leave')}
        loading={departing}
        onConfirm={leave}
        onCancel={() => setLeaving(false)}
      />
    </div>
  );
}
