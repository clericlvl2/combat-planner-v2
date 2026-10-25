import type { LinkToken } from '@combat-planner/api/client';
import type { CombatId } from '@combat-planner/domain';
import { LinkExpired, PlayerView } from '@combat-planner/ui';
import { useLoaderData, useNavigate } from 'react-router';

export interface PlayerRouteData {
  combatId: CombatId;
  token: LinkToken | null;
}

export function PlayerPage() {
  const { combatId, token } = useLoaderData<PlayerRouteData>();
  const navigate = useNavigate();
  const goHome = () => void navigate('/');
  if (token === null) return <LinkExpired onHome={goHome} />;
  return (
    <PlayerView key={`${combatId}:${token}`} combatId={combatId} token={token} onHome={goHome} />
  );
}
