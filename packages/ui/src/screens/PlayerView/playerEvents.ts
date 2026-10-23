import type { PlayerCombat, PlayerUnit, UnitId } from '@combat-planner/domain';

export type PlayerEvent =
  | { kind: 'restarted' }
  | { kind: 'cleared' }
  | { kind: 'released'; unitId: UnitId; name: string }
  | { kind: 'removed'; unitId: UnitId; name: string }
  | { kind: 'taken'; unitId: UnitId; name: string };

export type PlayerEventKind = PlayerEvent['kind'];

const claimedByOther = (unit: PlayerUnit): boolean =>
  unit.mine !== true && (unit.claimedByName ?? null) !== null;

export function playerEvents(previous: PlayerCombat, next: PlayerCombat): PlayerEvent[] {
  if (previous.units.length > 0 && next.units.length === 0) return [{ kind: 'cleared' }];
  const events: PlayerEvent[] = [];
  if (previous.status === 'active' && next.status === 'setup') events.push({ kind: 'restarted' });
  const after = new Map(next.units.map((unit) => [unit.id, unit]));
  for (const unit of previous.units) {
    const current = after.get(unit.id);
    if (unit.mine === true) {
      if (current === undefined) {
        events.push({ kind: 'removed', unitId: unit.id, name: unit.name });
      } else if (current.mine !== true) {
        events.push({ kind: 'released', unitId: unit.id, name: unit.name });
      }
      continue;
    }
    const wasFree = unit.role === 'hero' && !claimedByOther(unit);
    if (wasFree && current !== undefined && claimedByOther(current)) {
      events.push({ kind: 'taken', unitId: unit.id, name: unit.name });
    }
  }
  return events;
}
