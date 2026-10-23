import type { Combat, PlayerId, Viewer } from '@combat-planner/domain';
import { actionSchema, project, ulidSchema } from '@combat-planner/domain';
import { zValidator } from '@hono/zod-validator';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { ulid } from 'ulid';
import { z } from 'zod';
import type { ApiAppEnv } from '../app.ts';
import type { LinkToken, PlayView, PlayerCredentials } from '../client.ts';
import { linkTokenSchema } from '../client.ts';
import { dispatch } from '../combats/dispatch.ts';
import { NOT_FOUND, findCombatRow, nowIso } from '../combats/store.ts';
import { signPlayerKey, verifyLink, verifyPlayerKey } from '../link/token.ts';
import { streamCombatEvents } from '../live/sse.ts';
import { dmLanguage, recordPlayer } from './store.ts';

const PLAYER_ID_HEADER = 'X-Player-Id';
const PLAYER_KEY_HEADER = 'X-Player-Key';

const LINK_REVOKED = { code: 'linkRevoked', message: 'This link was reissued' } as const;
const UNAUTHORIZED = {
  code: 'unauthorized',
  message: 'Join the combat to get a player key',
} as const;

const tokenQuerySchema = z.object({ t: linkTokenSchema });
const eventsQuerySchema = z.object({
  t: linkTokenSchema,
  playerId: z.string().optional(),
  playerKey: z.string().optional(),
});

type PlayerViewer = Extract<Viewer, { kind: 'player' }>;

interface Resolved {
  combat: Combat;
  ownerId: string;
}

interface ResolvedPlayer extends Resolved {
  viewer: PlayerViewer;
}

type Refusal =
  | { status: 401; body: typeof UNAUTHORIZED }
  | { status: 404; body: typeof NOT_FOUND }
  | { status: 410; body: typeof LINK_REVOKED };

interface GivenCredentials {
  playerId: string | undefined;
  playerKey: string | undefined;
}

const resolveLink = (c: Context<ApiAppEnv>, token: LinkToken): Resolved | Refusal => {
  const claims = verifyLink(token, c.get('env').linkSecret);
  if (!claims || claims.combatId !== c.req.param('id')) return { status: 404, body: NOT_FOUND };
  const row = findCombatRow(c.get('db'), claims.combatId);
  if (!row) return { status: 404, body: NOT_FOUND };
  if (row.document.linkGeneration !== claims.generation) {
    return { status: 410, body: LINK_REVOKED };
  }
  return { combat: row.document, ownerId: row.ownerId };
};

const resolvePlayer = (
  c: Context<ApiAppEnv>,
  token: LinkToken,
  given: GivenCredentials,
): ResolvedPlayer | Refusal => {
  const resolved = resolveLink(c, token);
  if ('status' in resolved) return resolved;
  const playerId = ulidSchema.safeParse(given.playerId);
  if (!playerId.success || given.playerKey === undefined) {
    return { status: 401, body: UNAUTHORIZED };
  }
  const claims = {
    combatId: resolved.combat.id,
    generation: resolved.combat.linkGeneration,
    playerId: playerId.data,
  };
  if (!verifyPlayerKey(given.playerKey, claims, c.get('env').linkSecret)) {
    return { status: 401, body: UNAUTHORIZED };
  }
  return { ...resolved, viewer: { kind: 'player', playerId: playerId.data } };
};

const headerCredentials = (c: Context<ApiAppEnv>): GivenCredentials => ({
  playerId: c.req.header(PLAYER_ID_HEADER),
  playerKey: c.req.header(PLAYER_KEY_HEADER),
});

const rememberName = (c: Context<ApiAppEnv>, combat: Combat, playerId: PlayerId): void => {
  const displayName = combat.players[playerId];
  if (displayName !== undefined) recordPlayer(c.get('db'), combat.id, playerId, displayName);
};

export const playApp = new Hono<ApiAppEnv>()
  .post('/:id/join', zValidator('query', tokenQuerySchema), (c) => {
    const resolved = resolveLink(c, c.req.valid('query').t);
    if ('status' in resolved) return c.json(resolved.body, resolved.status);
    const { id: combatId, linkGeneration: generation } = resolved.combat;
    const playerId = ulid();
    const credentials: PlayerCredentials = {
      playerId,
      playerKey: signPlayerKey({ combatId, generation, playerId }, c.get('env').linkSecret),
    };
    return c.json(credentials);
  })
  .get('/:id', zValidator('query', tokenQuerySchema), (c) => {
    const player = resolvePlayer(c, c.req.valid('query').t, headerCredentials(c));
    if ('status' in player) return c.json(player.body, player.status);
    const { combat, ownerId, viewer } = player;
    rememberName(c, combat, viewer.playerId);
    const view: PlayView = {
      combatId: combat.id,
      playerId: viewer.playerId,
      language: dmLanguage(c.get('db'), ownerId),
      combat: project(combat, viewer),
    };
    return c.json(view);
  })
  .post(
    '/:id/actions',
    zValidator('query', tokenQuerySchema),
    zValidator('json', actionSchema),
    (c) => {
      const player = resolvePlayer(c, c.req.valid('query').t, headerCredentials(c));
      if ('status' in player) return c.json(player.body, player.status);
      const { viewer } = player;
      const outcome = dispatch(c.get('db'), {
        combatId: player.combat.id,
        viewer,
        action: c.req.valid('json'),
        now: nowIso(),
      });
      if (!outcome.ok) {
        return c.json({ code: outcome.code, message: outcome.message }, outcome.status);
      }
      rememberName(c, outcome.combat, viewer.playerId);
      return c.json({ version: outcome.version });
    },
  )
  .get('/:id/events', zValidator('query', eventsQuerySchema), (c) => {
    const { t, playerId, playerKey } = c.req.valid('query');
    const player = resolvePlayer(c, t, { playerId, playerKey });
    if ('status' in player) return c.json(player.body, player.status);
    const db = c.get('db');
    const { combat, ownerId, viewer } = player;
    const combatId = combat.id;
    return streamCombatEvents(c, {
      combatId,
      viewer,
      load: () => {
        const current = findCombatRow(db, combatId)?.document;
        return current && project(current, viewer);
      },
      language: () => dmLanguage(db, ownerId),
    });
  });
