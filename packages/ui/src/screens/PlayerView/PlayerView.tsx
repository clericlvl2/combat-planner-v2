import { ApiError } from '@combat-planner/api/client';
import type { LinkToken } from '@combat-planner/api/client';
import type { Action, CombatId, PlayerCombat, UnitId } from '@combat-planner/domain';
import { IconLogout } from '@tabler/icons-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi } from '../../api/ApiProvider.tsx';
import { errorToast } from '../../hooks/toasts.ts';
import { useCombat } from '../../hooks/useCombat.ts';
import { useLocaleChoice } from '../../hooks/useLocaleChoice.ts';
import { useToasts } from '../../hooks/useToasts.ts';
import { Dialog } from '../../organisms/Dialog/Dialog.tsx';
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
  random?: () => number;
  onHome: () => void;
}

type View = 'heroes' | 'turnOrder';

const PLAYER = { kind: 'player' } as const;

const holdsHero = (combat: PlayerCombat): boolean =>
  combat.units.some((unit) => unit.mine === true);

export function PlayerView({ combatId, token, random, onHome }: PlayerViewProps) {
  const { combat, language, error, ended, dispatch, refetch } = useCombat(combatId, PLAYER, token);
  const { i18n } = useTranslation();
  const { chosen } = useLocaleChoice();
  const { t: tDialog } = useTranslation('Dialog');
  const api = useApi();
  const { show, t: tToast } = useToasts();
  const notify = usePlayerToasts();
  const [view, setView] = useState<View | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [seenTitle, setSeenTitle] = useState<string | null>(null);
  const ownReleases = useRef(new Set<UnitId>());
  const previous = useRef<PlayerCombat | undefined>(undefined);

  if (combat && view === null) setView(holdsHero(combat) ? 'turnOrder' : 'heroes');
  if (combat && combat.title !== seenTitle) setSeenTitle(combat.title);

  useLayoutEffect(() => {
    const shown = chosen() ?? language;
    if (shown !== null && i18n.language !== shown) void i18n.changeLanguage(shown);
  }, [language, i18n, chosen]);

  useEffect(() => {
    const before = previous.current;
    previous.current = combat;
    if (before === undefined || combat === undefined || before === combat) return;
    let lostHero = false;
    for (const event of playerEvents(before, combat)) {
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
    if (lostHero && !holdsHero(combat)) setView('heroes');
  }, [combat, notify]);

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

  const leave = () => {
    setLeaving(false);
    void api.play.leave(combatId).then(
      () => onHome(),
      (failure: unknown) => {
        show(
          errorToast(failure, tToast, leave) ?? {
            message: tToast('serverUnreachable'),
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
    if (error === null) return null;
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
        onConfirm={leave}
        onCancel={() => setLeaving(false)}
      />
    </div>
  );
}
