import type { LinkToken } from '@combat-planner/api/client';
import type { CombatId, PlayerId } from '@combat-planner/domain';
import {
  CombatScreen,
  LinkExpired,
  NotFound,
  PlayerView,
  UnexpectedError,
} from '@combat-planner/ui';
import { Outlet, useLoaderData, useNavigate } from 'react-router';

export interface CombatRouteData {
  combatId: CombatId;
}

export interface PlayerRouteData {
  combatId: CombatId;
  token: LinkToken | null;
  playerId: PlayerId;
}

export function CombatPage() {
  const { combatId } = useLoaderData<CombatRouteData>();
  return <CombatScreen key={combatId} combatId={combatId} />;
}

export function PlayerPage() {
  const { combatId, token, playerId } = useLoaderData<PlayerRouteData>();
  if (token === null) return <LinkExpired />;
  return (
    <PlayerView
      key={`${combatId}:${token}`}
      combatId={combatId}
      token={token}
      playerId={playerId}
    />
  );
}

export function DmPages() {
  return <Outlet />;
}

export function NotFoundPage() {
  const navigate = useNavigate();
  return <NotFound onGoToCombats={() => void navigate('/combats')} />;
}

export function RouteError() {
  return <UnexpectedError onReload={() => window.location.reload()} />;
}
