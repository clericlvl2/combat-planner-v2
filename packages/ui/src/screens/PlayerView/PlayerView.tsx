import { ApiError } from '@combat-planner/api/client';
import type { LinkToken } from '@combat-planner/api/client';
import type { Action, CombatId, PlayerCombat, PlayerId, UnitId } from '@combat-planner/domain';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCombat } from '../../hooks/useCombat.ts';
import { CantReachServer } from '../CantReachServer/CantReachServer.tsx';
import { CombatDeleted } from '../CombatDeleted/CombatDeleted.tsx';
import { Heroes } from '../Heroes/Heroes.tsx';
import { LinkExpired } from '../LinkExpired/LinkExpired.tsx';
import { TurnOrder } from '../TurnOrder/TurnOrder.tsx';
import { UnexpectedError } from '../UnexpectedError/UnexpectedError.tsx';
import { usePlayerToasts } from './PlayerToast.tsx';
import { playerEvents } from './playerEvents.ts';
import classes from './PlayerView.module.css';

export interface PlayerViewProps {
  combatId: CombatId;
  token: LinkToken;
  playerId: PlayerId;
  random?: () => number;
}

type View = 'heroes' | 'turnOrder';

const holdsHero = (combat: PlayerCombat, playerId: PlayerId): boolean =>
  combat.units.some((unit) => unit.claimedBy === playerId);

export function PlayerView({ combatId, token, playerId, random }: PlayerViewProps) {
  const { combat, language, error, ended, dispatch, refetch } = useCombat(
    combatId,
    { kind: 'player', playerId },
    token,
  );
  const { i18n } = useTranslation();
  const notify = usePlayerToasts();
  const [view, setView] = useState<View | null>(null);
  const [seenTitle, setSeenTitle] = useState<string | null>(null);
  const ownReleases = useRef(new Set<UnitId>());
  const previous = useRef<PlayerCombat | undefined>(undefined);

  if (combat && view === null) setView(holdsHero(combat, playerId) ? 'turnOrder' : 'heroes');
  if (combat && combat.title !== seenTitle) setSeenTitle(combat.title);

  useLayoutEffect(() => {
    if (language !== null && i18n.language !== language) void i18n.changeLanguage(language);
  }, [language, i18n]);

  useEffect(() => {
    const before = previous.current;
    previous.current = combat;
    if (before === undefined || combat === undefined || before === combat) return;
    let lostHero = false;
    for (const event of playerEvents(before, combat, playerId)) {
      if (event.kind === 'taken') continue;
      if (event.kind === 'released' && ownReleases.current.delete(event.unitId)) {
        lostHero = true;
        continue;
      }
      if (event.kind === 'released' || event.kind === 'removed') {
        lostHero = true;
        notify(event.kind, event.name);
      } else {
        notify(event.kind);
      }
    }
    if (lostHero && !holdsHero(combat, playerId)) setView('heroes');
  }, [combat, playerId, notify]);

  const send = useCallback(
    async (action: Action) => {
      const ownRelease = action.type === 'releaseUnit' ? action.unitId : null;
      if (ownRelease !== null) ownReleases.current.add(ownRelease);
      const result = await dispatch(action);
      if (ownRelease !== null && !result.applied) ownReleases.current.delete(ownRelease);
      return result;
    },
    [dispatch],
  );

  const reload = () => {
    void refetch();
  };

  if (ended?.type === 'linkRevoked') return <LinkExpired />;
  if (ended?.type === 'deleted') {
    return <CombatDeleted combatTitle={ended.title || (combat?.title ?? seenTitle)} />;
  }
  if (combat === undefined) {
    if (error === null) return null;
    if (error instanceof ApiError && error.code === 'linkRevoked') return <LinkExpired />;
    if (error instanceof ApiError && error.code === 'notFound') {
      return <CombatDeleted combatTitle={seenTitle} />;
    }
    if (error instanceof ApiError && error.code === 'network') {
      return <CantReachServer onRetry={reload} />;
    }
    return <UnexpectedError onReload={reload} />;
  }

  return (
    <div className={classes.root}>
      {view === 'heroes' ? (
        <Heroes
          combat={combat}
          playerId={playerId}
          dispatch={send}
          onDone={() => setView('turnOrder')}
        />
      ) : (
        <TurnOrder
          combat={combat}
          playerId={playerId}
          dispatch={send}
          random={random}
          onHeroes={() => setView('heroes')}
        />
      )}
    </div>
  );
}
