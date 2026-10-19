import type { CombatId, PlayerCombat, Viewer } from '@combat-planner/domain';
import { project } from '@combat-planner/domain';
import type { ApiEvent, DmCombat, Locale } from '../client.ts';

export type Audience = Viewer['kind'];

export interface Subscriber {
  viewer: Viewer;
  send(event: ApiEvent): void;
  language?: () => Locale;
}

export type Unsubscribe = () => void;

const subscribers = new Map<CombatId, Set<Subscriber>>();

const audienceOf = (combatId: CombatId, audience?: Audience): Subscriber[] =>
  [...(subscribers.get(combatId) ?? [])].filter(
    (subscriber) => audience === undefined || subscriber.viewer.kind === audience,
  );

export function subscribe(combatId: CombatId, subscriber: Subscriber): Unsubscribe {
  const set = subscribers.get(combatId) ?? new Set<Subscriber>();
  set.add(subscriber);
  subscribers.set(combatId, set);
  return () => {
    set.delete(subscriber);
    if (set.size === 0) subscribers.delete(combatId);
  };
}

export function broadcast(combatId: CombatId, event: ApiEvent, audience?: Audience): void {
  for (const subscriber of audienceOf(combatId, audience)) subscriber.send(event);
}

export const documentFor = (combat: DmCombat, viewer: Viewer): DmCombat | PlayerCombat =>
  viewer.kind === 'dm' ? combat : project(combat, viewer);

export function broadcastDocument(combatId: CombatId, combat: DmCombat, audience?: Audience): void {
  for (const subscriber of audienceOf(combatId, audience)) {
    const language = subscriber.language?.();
    subscriber.send({
      type: 'document',
      version: combat.version,
      document: documentFor(combat, subscriber.viewer),
      ...(language === undefined ? {} : { language }),
    });
  }
}

export const subscriberCount = (combatId: CombatId): number => subscribers.get(combatId)?.size ?? 0;
