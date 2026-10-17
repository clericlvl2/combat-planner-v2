import type { PlayerCombat, PlayerId, UnitId } from '@combat-planner/domain';

export type PlayerEvent =
  | { kind: 'restarted' }
  | { kind: 'cleared' }
  | { kind: 'released'; unitId: UnitId; name: string }
  | { kind: 'removed'; unitId: UnitId; name: string }
  | { kind: 'taken'; unitId: UnitId; name: string; by: PlayerId };

export type PlayerEventKind = PlayerEvent['kind'];

export function playerEvents(
  previous: PlayerCombat,
  next: PlayerCombat,
  playerId: PlayerId,
): PlayerEvent[] {
  if (previous.units.length > 0 && next.units.length === 0) return [{ kind: 'cleared' }];
  const events: PlayerEvent[] = [];
  if (previous.status === 'active' && next.status === 'setup') events.push({ kind: 'restarted' });
  const after = new Map(next.units.map((unit) => [unit.id, unit]));
  for (const unit of previous.units) {
    const current = after.get(unit.id);
    if (unit.claimedBy === playerId) {
      if (current === undefined) {
        events.push({ kind: 'removed', unitId: unit.id, name: unit.name });
      } else if (current.claimedBy !== playerId) {
        events.push({ kind: 'released', unitId: unit.id, name: unit.name });
      }
      continue;
    }
    const wasFree = unit.role === 'hero' && (unit.claimedBy ?? null) === null;
    const by = current?.claimedBy ?? null;
    if (wasFree && current !== undefined && by !== null && by !== playerId) {
      events.push({ kind: 'taken', unitId: unit.id, name: unit.name, by });
    }
  }
  return events;
}
