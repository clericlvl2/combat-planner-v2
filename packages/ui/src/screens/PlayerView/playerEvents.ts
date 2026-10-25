import type { PlayerCombat, PlayerUnit, UnitId } from '@combat-planner/domain';

export type PlayerEvent =
  | { kind: 'restarted' }
  | { kind: 'cleared' }
  | { kind: 'released'; unitId: UnitId; name: string }
  | { kind: 'removed'; unitId: UnitId; name: string }
  | { kind: 'playerClaimed'; unitId: UnitId; player: string; hero: string }
  | { kind: 'playerReleased'; unitId: UnitId; player: string; hero: string };

export type PlayerEventKind = PlayerEvent['kind'];

const heldByOther = (unit: PlayerUnit): string | null =>
  unit.mine === true ? null : (unit.claimedByName ?? null);

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
    if (current === undefined) continue;
    const before = heldByOther(unit);
    const now = heldByOther(current);
    if (before !== null && before !== now) {
      events.push({ kind: 'playerReleased', unitId: unit.id, player: before, hero: current.name });
    }
    if (now !== null && now !== before) {
      events.push({ kind: 'playerClaimed', unitId: unit.id, player: now, hero: current.name });
    }
  }
  return events;
}
