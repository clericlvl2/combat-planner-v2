import type { DmCombat } from '@combat-planner/api/client';
import type { UnitId } from '@combat-planner/domain';

export interface ClaimEvent {
  kind: 'claimed' | 'released';
  unitId: UnitId;
  player: string;
  hero: string;
}

export function claimEvents(previous: DmCombat, next: DmCombat): ClaimEvent[] {
  const after = new Map(next.units.map((unit) => [unit.id, unit]));
  const events: ClaimEvent[] = [];
  for (const unit of previous.units) {
    const current = after.get(unit.id);
    if (current === undefined || current.claimedBy === unit.claimedBy) continue;
    if (unit.claimedBy !== null) {
      const player = previous.players[unit.claimedBy];
      if (player !== undefined && next.players[unit.claimedBy] !== undefined) {
        events.push({ kind: 'released', unitId: unit.id, player, hero: current.name });
      }
    }
    if (current.claimedBy !== null) {
      const player = next.players[current.claimedBy];
      if (player !== undefined) {
        events.push({ kind: 'claimed', unitId: unit.id, player, hero: current.name });
      }
    }
  }
  return events;
}
