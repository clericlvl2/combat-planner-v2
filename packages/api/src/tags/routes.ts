import type { Tag } from '@combat-planner/domain';
import { LIMITS, tagNameSchema } from '@combat-planner/domain';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiAppEnv } from '../app.ts';
import { requireUser } from '../auth/require-user.ts';
import { tagCreateInputSchema } from '../client.ts';
import type { Transaction } from '../combats/store.ts';
import {
  TAG_NOT_FOUND,
  countOwnTags,
  deleteTag,
  findOwnTag,
  findTagRow,
  insertTag,
  isNameTaken,
  listOwnTags,
  renameTag,
} from './store.ts';

const NAME_TAKEN = { code: 'invalid', message: 'A tag with this name already exists' } as const;

const LIMIT_REACHED = {
  code: 'limit',
  message: `A DM keeps at most ${LIMITS.tagsPerDm} tags`,
} as const;

const ID_IN_USE = { code: 'invalid', message: 'This id belongs to another tag' } as const;

const tagNameInputSchema = z.string().trim().pipe(tagNameSchema);

const tagInputSchema = tagCreateInputSchema.extend({ name: tagNameInputSchema });

const renameBodySchema = z.object({ name: tagNameInputSchema });

type Stored =
  | { tag: Tag }
  | { taken: typeof NAME_TAKEN }
  | { rejected: typeof ID_IN_USE | typeof LIMIT_REACHED };

const store = (tx: Transaction, ownerId: string, tag: Tag): Stored => {
  const existing = findTagRow(tx, tag.id);
  if (existing) {
    return existing.ownerId === ownerId ? { tag: existing.tag } : { rejected: ID_IN_USE };
  }
  if (isNameTaken(tx, ownerId, tag.name)) return { taken: NAME_TAKEN };
  if (countOwnTags(tx, ownerId) >= LIMITS.tagsPerDm) return { rejected: LIMIT_REACHED };
  insertTag(tx, ownerId, tag);
  return { tag };
};

export const tagsApp = new Hono<ApiAppEnv>()
  .use(requireUser)
  .get('/', (c) => c.json(listOwnTags(c.get('db'), c.get('userId'))))
  .post('/', zValidator('json', tagInputSchema), (c) => {
    const input = c.req.valid('json');
    const stored = c.get('db').transaction((tx) => store(tx, c.get('userId'), input));
    if ('taken' in stored) return c.json(stored.taken, 409);
    if ('rejected' in stored) return c.json(stored.rejected, 422);
    return c.json(stored.tag);
  })
  .patch('/:id', zValidator('json', renameBodySchema), (c) => {
    const { name } = c.req.valid('json');
    const renamed = c.get('db').transaction((tx) => {
      const tag = findOwnTag(tx, c.get('userId'), c.req.param('id'));
      if (!tag) return undefined;
      if (isNameTaken(tx, c.get('userId'), name, tag.id)) return { taken: NAME_TAKEN };
      const next: Tag = { ...tag, name };
      renameTag(tx, next);
      return { tag: next };
    });
    if (!renamed) return c.json(TAG_NOT_FOUND, 404);
    if ('taken' in renamed) return c.json(renamed.taken, 409);
    return c.json(renamed.tag);
  })
  .delete('/:id', (c) => {
    const removed = c.get('db').transaction((tx) => {
      const tag = findOwnTag(tx, c.get('userId'), c.req.param('id'));
      if (!tag) return undefined;
      deleteTag(tx, tag.id);
      return tag;
    });
    if (!removed) return c.json(TAG_NOT_FOUND, 404);
    return c.body(null, 204);
  });
