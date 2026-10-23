import { describe, expect, it } from 'vite-plus/test';
import { LIMITS } from './schemas.ts';
import {
  LINK_LIVE,
  LINK_OFF,
  PLAYER_CLOSED,
  PLAYER_DROPPED,
  PLAYER_PLAYING,
  SHARING_TIMEOUTS,
  closePlayer,
  enterPlayer,
  followClaims,
  reissueLink,
  shareLink,
  sweepLink,
  sweepStream,
  sweepWatching,
} from './sharing.ts';
import type { ConnectedPlayer, LinkState, PlayerState } from './sharing.ts';

const START = '2026-10-23T12:00:00.000Z';

const after = (minutes: number, seconds = 0): string =>
  new Date(Date.parse(START) + (minutes * 60 + seconds) * 1000).toISOString();

const orphaned: LinkState = { phase: 'orphaned', since: START };
const watching: ConnectedPlayer = { phase: 'watching', since: START };
const playing: ConnectedPlayer = { phase: 'playing' };

describe('SHARING_TIMEOUTS', () => {
  it('follows LIMITS', () => {
    expect(LIMITS.orphanedLinkMinutes).toBe(15);
    expect(LIMITS.watchingMinutes).toBe(15);
    expect(LIMITS.idleStreamHours).toBe(2);
    expect(SHARING_TIMEOUTS).toEqual({
      orphanedLinkMs: 15 * 60_000,
      watchingMs: 15 * 60_000,
      idleStreamMs: 2 * 3_600_000,
    });
  });
});

describe('link of a combat', () => {
  it('ENTRY → LIVE: opening the share sheet makes an off link live', () => {
    expect(shareLink(LINK_OFF)).toEqual(LINK_LIVE);
    expect(shareLink(LINK_LIVE)).toEqual(LINK_LIVE);
  });

  it('LIVE → ORPHANED: the owner has no session', () => {
    expect(sweepLink(LINK_LIVE, { ownerSignedInSince: null, now: START })).toEqual(orphaned);
  });

  it('LIVE stays while the owner has a session', () => {
    expect(sweepLink(LINK_LIVE, { ownerSignedInSince: START, now: after(30) })).toEqual(LINK_LIVE);
  });

  it('ORPHANED → LIVE: the owner signed in before 15 minutes passed', () => {
    expect(sweepLink(orphaned, { ownerSignedInSince: after(14, 59), now: after(15, 30) })).toEqual(
      LINK_LIVE,
    );
  });

  it('ORPHANED → OFF: 15 minutes passed', () => {
    expect(sweepLink(orphaned, { ownerSignedInSince: null, now: after(15) })).toEqual(LINK_OFF);
  });

  it('ORPHANED → OFF when the owner signed in only after 15 minutes', () => {
    expect(sweepLink(orphaned, { ownerSignedInSince: after(15), now: after(15) })).toEqual(
      LINK_OFF,
    );
  });

  it('ORPHANED stays at 14:59', () => {
    expect(sweepLink(orphaned, { ownerSignedInSince: null, now: after(14, 59) })).toEqual(orphaned);
  });

  it('LIVE → OFF and ORPHANED → OFF: the DM reissued the link, which is live again', () => {
    expect(reissueLink()).toEqual(LINK_LIVE);
  });

  it('OFF stays off for the sweeper', () => {
    expect(sweepLink(LINK_OFF, { ownerSignedInSince: null, now: after(60) })).toEqual(LINK_OFF);
  });

  it('honours shortened timeouts', () => {
    const short = { ...SHARING_TIMEOUTS, orphanedLinkMs: 10_000 };
    expect(sweepLink(orphaned, { ownerSignedInSince: null, now: after(0, 9) }, short)).toEqual(
      orphaned,
    );
    expect(sweepLink(orphaned, { ownerSignedInSince: null, now: after(0, 10) }, short)).toEqual(
      LINK_OFF,
    );
  });
});

describe('player', () => {
  it('ENTRY → WATCHING: a new player watches from the moment they open the link', () => {
    expect(enterPlayer(null, START)).toEqual(watching);
  });

  it('WATCHING → PLAYING: claimed a hero', () => {
    expect(followClaims(watching, true, after(1))).toEqual(playing);
  });

  it('PLAYING → WATCHING: released the hero', () => {
    expect(followClaims(playing, false, after(5))).toEqual({ phase: 'watching', since: after(5) });
  });

  it('keeps the WATCHING start while the player still holds no hero', () => {
    expect(followClaims(watching, false, after(5))).toEqual(watching);
  });

  it('WATCHING → DROPPED: 15 minutes in WATCHING', () => {
    expect(sweepWatching(watching, after(15))).toEqual(PLAYER_DROPPED);
  });

  it('WATCHING stays at 14:59', () => {
    expect(sweepWatching(watching, after(14, 59))).toEqual(watching);
  });

  it('PLAYING never times out as WATCHING', () => {
    expect(sweepWatching(playing, after(600))).toEqual(playing);
  });

  it('WATCHING → DROPPED: 2 hours without any action', () => {
    const activity = { openedAt: START, lastActionAt: START, now: after(120) };
    expect(sweepStream(watching, activity)).toEqual(PLAYER_DROPPED);
  });

  it('PLAYING → DROPPED: 2 hours without any action', () => {
    const activity = { openedAt: START, lastActionAt: START, now: after(120) };
    expect(sweepStream(playing, activity)).toEqual(PLAYER_DROPPED);
  });

  it('PLAYING stays at 1:59:59 and counts from the later of stream open and last action', () => {
    expect(
      sweepStream(playing, { openedAt: START, lastActionAt: START, now: after(119, 59) }),
    ).toEqual(playing);
    expect(
      sweepStream(playing, { openedAt: START, lastActionAt: after(60), now: after(120) }),
    ).toEqual(playing);
    expect(
      sweepStream(playing, { openedAt: after(60), lastActionAt: START, now: after(179, 59) }),
    ).toEqual(playing);
    expect(
      sweepStream(playing, { openedAt: after(60), lastActionAt: START, now: after(180) }),
    ).toEqual(PLAYER_DROPPED);
  });

  it('DROPPED → ENTRY: a kept claim returns as PLAYING', () => {
    expect(enterPlayer(playing, after(130))).toEqual(PLAYER_PLAYING);
  });

  it('DROPPED → ENTRY: a removed player returns as WATCHING from now', () => {
    expect(enterPlayer(null, after(20))).toEqual({ phase: 'watching', since: after(20) });
  });

  it('any state → CLOSED: the link turned off', () => {
    const states: PlayerState[] = [watching, playing, PLAYER_DROPPED, PLAYER_CLOSED];
    for (const state of states) expect(closePlayer(state)).toEqual(PLAYER_CLOSED);
  });
});
