import { LIMITS } from './schemas.ts';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export interface SharingTimeouts {
  orphanedLinkMs: number;
  watchingMs: number;
  idleStreamMs: number;
}

export const SHARING_TIMEOUTS: SharingTimeouts = {
  orphanedLinkMs: LIMITS.orphanedLinkMinutes * MINUTE_MS,
  watchingMs: LIMITS.watchingMinutes * MINUTE_MS,
  idleStreamMs: LIMITS.idleStreamHours * HOUR_MS,
};

export type LinkState = { phase: 'live' } | { phase: 'orphaned'; since: string } | { phase: 'off' };

export const LINK_LIVE: LinkState = { phase: 'live' };
export const LINK_OFF: LinkState = { phase: 'off' };

const elapsed = (since: string, now: string): number => Date.parse(now) - Date.parse(since);

export const shareLink = (state: LinkState): LinkState =>
  state.phase === 'off' ? LINK_LIVE : state;

export const reissueLink = (): LinkState => LINK_LIVE;

export interface LinkSweep {
  ownerSignedInSince: string | null;
  now: string;
}

export const sweepLink = (
  state: LinkState,
  { ownerSignedInSince, now }: LinkSweep,
  timeouts: SharingTimeouts = SHARING_TIMEOUTS,
): LinkState => {
  if (state.phase === 'off') return state;
  if (state.phase === 'live') {
    return ownerSignedInSince === null ? { phase: 'orphaned', since: now } : state;
  }
  const deadline = Date.parse(state.since) + timeouts.orphanedLinkMs;
  if (ownerSignedInSince !== null && Date.parse(ownerSignedInSince) < deadline) return LINK_LIVE;
  return Date.parse(now) >= deadline ? LINK_OFF : state;
};

export type PlayerState =
  | { phase: 'watching'; since: string }
  | { phase: 'playing' }
  | { phase: 'dropped' }
  | { phase: 'closed' };

export type ConnectedPlayer = Extract<PlayerState, { phase: 'watching' | 'playing' }>;

export const PLAYER_PLAYING: PlayerState = { phase: 'playing' };
export const PLAYER_DROPPED: PlayerState = { phase: 'dropped' };
export const PLAYER_CLOSED: PlayerState = { phase: 'closed' };

export const enterPlayer = (kept: ConnectedPlayer | null, now: string): ConnectedPlayer =>
  kept ?? { phase: 'watching', since: now };

export const followClaims = (
  state: ConnectedPlayer,
  holdsHero: boolean,
  now: string,
): ConnectedPlayer => {
  if (holdsHero) return state.phase === 'playing' ? state : { phase: 'playing' };
  return state.phase === 'watching' ? state : { phase: 'watching', since: now };
};

export const sweepWatching = (
  state: ConnectedPlayer,
  now: string,
  timeouts: SharingTimeouts = SHARING_TIMEOUTS,
): PlayerState =>
  state.phase === 'watching' && elapsed(state.since, now) >= timeouts.watchingMs
    ? PLAYER_DROPPED
    : state;

export interface StreamActivity {
  openedAt: string;
  lastActionAt: string;
  now: string;
}

export const streamIdle = (
  { openedAt, lastActionAt, now }: StreamActivity,
  timeouts: SharingTimeouts = SHARING_TIMEOUTS,
): boolean => {
  const latest = Math.max(Date.parse(openedAt), Date.parse(lastActionAt));
  return Date.parse(now) - latest >= timeouts.idleStreamMs;
};

export const sweepStream = (
  state: ConnectedPlayer,
  activity: StreamActivity,
  timeouts: SharingTimeouts = SHARING_TIMEOUTS,
): PlayerState => (streamIdle(activity, timeouts) ? PLAYER_DROPPED : state);

export const closePlayer = (state: PlayerState): PlayerState =>
  state.phase === 'closed' ? state : PLAYER_CLOSED;
