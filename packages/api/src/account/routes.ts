import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { ApiAppEnv } from '../app.ts';
import type { AuthInstance } from '../auth/index.ts';
import { requireUser } from '../auth/require-user.ts';
import { accountPatchSchema } from '../client.ts';
import { broadcast } from '../live/registry.ts';
import { closeEndedDmStreams } from '../sharing/streams.ts';
import { USER_NOT_FOUND, deleteUser, findSession, renameUser } from './store.ts';

export function createAccountApp(auth: AuthInstance) {
  return new Hono<ApiAppEnv>()
    .use(requireUser)
    .patch('/', zValidator('json', accountPatchSchema), (c) => {
      const { displayName } = c.req.valid('json');
      const session = c
        .get('db')
        .transaction((tx) =>
          renameUser(tx, c.get('userId'), displayName)
            ? findSession(tx, c.get('userId'))
            : undefined,
        );
      if (!session) return c.json(USER_NOT_FOUND, 404);
      return c.json(session);
    })
    .delete('/', async (c) => {
      const removed = c.get('db').transaction((tx) => deleteUser(tx, c.get('userId')));
      if (!removed) return c.json(USER_NOT_FOUND, 404);
      for (const combat of removed) broadcast(combat.id, { type: 'deleted', title: combat.title });
      const signedOut = await auth.api.signOut({
        headers: c.req.raw.headers,
        returnHeaders: true,
      });
      for (const cookie of signedOut.headers.getSetCookie()) {
        c.header('set-cookie', cookie, { append: true });
      }
      closeEndedDmStreams(c.get('db'));
      return c.body(null, 204);
    });
}
