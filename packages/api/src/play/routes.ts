import type { Combat, PlayerId, Viewer } from '@combat-planner/domain';
import { actionSchema, project, ulidSchema } from '@combat-planner/domain';
import { zValidator } from '@hono/zod-validator';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiAppEnv } from '../app.ts';
import type { LinkToken, PlayView } from '../client.ts';
import { linkTokenSchema } from '../client.ts';
import { dispatch } from '../combats/dispatch.ts';
import { dmDocument } from '../combats/log.ts';
import { NOT_FOUND, findCombatRow, nowIso } from '../combats/store.ts';
import { verifyLink } from '../link/token.ts';
import { streamCombatEvents } from '../live/sse.ts';
import { dmLanguage, recordPlayer } from './store.ts';

const PLAYER_ID_HEADER = 'X-Player-Id';

const LINK_REVOKED = { code: 'linkRevoked', message: 'This link was reissued' } as const;
const PLAYER_ID_INVALID = {
  code: 'invalid',
  message: `${PLAYER_ID_HEADER} must be a ULID`,
} as const;

const tokenQuerySchema = z.object({ t: linkTokenSchema });
const eventsQuerySchema = z.object({ t: linkTokenSchema, playerId: ulidSchema });

interface Resolved {
  combat: Combat;
  ownerId: string;
}

type Refusal = { status: 404; body: typeof NOT_FOUND } | { status: 410; body: typeof LINK_REVOKED };

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

const playerIdOf = (c: Context<ApiAppEnv>): PlayerId | undefined => {
  const parsed = ulidSchema.safeParse(c.req.header(PLAYER_ID_HEADER));
  return parsed.success ? parsed.data : undefined;
};

type PlayerViewer = Extract<Viewer, { kind: 'player' }>;

const playerViewer = (playerId: PlayerId): PlayerViewer => ({ kind: 'player', playerId });

const rememberName = (c: Context<ApiAppEnv>, combat: Combat, playerId: PlayerId): void => {
  const displayName = combat.players[playerId];
  if (displayName !== undefined) recordPlayer(c.get('db'), combat.id, playerId, displayName);
};

export const playApp = new Hono<ApiAppEnv>()
  .get('/:id', zValidator('query', tokenQuerySchema), (c) => {
    const resolved = resolveLink(c, c.req.valid('query').t);
    if ('status' in resolved) return c.json(resolved.body, resolved.status);
    const playerId = playerIdOf(c);
    if (playerId === undefined) return c.json(PLAYER_ID_INVALID, 400);
    rememberName(c, resolved.combat, playerId);
    const view: PlayView = {
      combatId: resolved.combat.id,
      playerId,
      language: dmLanguage(c.get('db'), resolved.ownerId),
      combat: project(resolved.combat, playerViewer(playerId)),
    };
    return c.json(view);
  })
  .post(
    '/:id/actions',
    zValidator('query', tokenQuerySchema),
    zValidator('json', actionSchema),
    (c) => {
      const resolved = resolveLink(c, c.req.valid('query').t);
      if ('status' in resolved) return c.json(resolved.body, resolved.status);
      const playerId = playerIdOf(c);
      if (playerId === undefined) return c.json(PLAYER_ID_INVALID, 400);
      const outcome = dispatch(c.get('db'), {
        combatId: resolved.combat.id,
        viewer: playerViewer(playerId),
        action: c.req.valid('json'),
        now: nowIso(),
      });
      if (!outcome.ok) {
        return c.json({ code: outcome.code, message: outcome.message }, outcome.status);
      }
      rememberName(c, outcome.combat, playerId);
      return c.json({ version: outcome.version });
    },
  )
  .get('/:id/events', zValidator('query', eventsQuerySchema), (c) => {
    const { t, playerId } = c.req.valid('query');
    const resolved = resolveLink(c, t);
    if ('status' in resolved) return c.json(resolved.body, resolved.status);
    const db = c.get('db');
    const combatId = resolved.combat.id;
    return streamCombatEvents(c, {
      combatId,
      viewer: playerViewer(playerId),
      load: () => {
        const combat = findCombatRow(db, combatId)?.document;
        return combat && dmDocument(db, combat);
      },
    });
  });
