import type { CombatId } from '@combat-planner/domain';
import { CombatScreen } from '@combat-planner/ui';
import { useLoaderData } from 'react-router';

export interface CombatRouteData {
  combatId: CombatId;
}

export function CombatPage() {
  const { combatId } = useLoaderData<CombatRouteData>();
  return <CombatScreen key={combatId} combatId={combatId} />;
}
