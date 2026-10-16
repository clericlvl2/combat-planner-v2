import type { Preset } from '@combat-planner/domain';
import { LIMITS, duplicateName, ulidSchema } from '@combat-planner/domain';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { ApiAppEnv } from '../app.ts';
import { requireUser } from '../auth/require-user.ts';
import { presetCreateInputSchema, presetPatchSchema } from '../client.ts';
import type { Transaction } from '../combats/store.ts';
import { nowIso } from '../combats/store.ts';
import {
  PRESET_NOT_FOUND,
  countOwnPresets,
  deletePreset,
  findOwnPreset,
  findPresetRow,
  insertPreset,
  listOwnPresets,
  ownsTags,
  savePreset,
} from './store.ts';

const LIMIT_REACHED = {
  code: 'limit',
  message: `A DM keeps at most ${LIMITS.presetsPerDm} presets`,
} as const;

const ID_IN_USE = { code: 'invalid', message: 'This id belongs to another preset' } as const;

const UNKNOWN_TAG = { code: 'invalid', message: 'A tag does not belong to you' } as const;

type Rejected = typeof LIMIT_REACHED | typeof ID_IN_USE | typeof UNKNOWN_TAG;

type Stored = { preset: Preset } | { rejected: Rejected };

const store = (tx: Transaction, ownerId: string, preset: Preset): Stored => {
  const existing = findPresetRow(tx, preset.id);
  if (existing) {
    return existing.ownerId === ownerId ? { preset: existing.preset } : { rejected: ID_IN_USE };
  }
  if (countOwnPresets(tx, ownerId) >= LIMITS.presetsPerDm) return { rejected: LIMIT_REACHED };
  if (!ownsTags(tx, ownerId, preset.tags)) return { rejected: UNKNOWN_TAG };
  insertPreset(tx, ownerId, preset);
  return { preset };
};

const duplicateBodySchema = z.object({ id: ulidSchema });

export const presetsApp = new Hono<ApiAppEnv>()
  .use(requireUser)
  .get('/', (c) => c.json(listOwnPresets(c.get('db'), c.get('userId'))))
  .post('/', zValidator('json', presetCreateInputSchema), (c) => {
    const input = c.req.valid('json');
    const now = nowIso();
    const preset: Preset = { ...input, createdAt: now, updatedAt: now };
    const stored = c.get('db').transaction((tx) => store(tx, c.get('userId'), preset));
    if ('rejected' in stored) return c.json(stored.rejected, 422);
    return c.json(stored.preset);
  })
  .patch('/:id', zValidator('json', presetPatchSchema), (c) => {
    const patch = c.req.valid('json');
    const updated = c.get('db').transaction((tx) => {
      const preset = findOwnPreset(tx, c.get('userId'), c.req.param('id'));
      if (!preset) return undefined;
      const next: Preset = { ...preset, ...patch, updatedAt: nowIso() };
      if (!ownsTags(tx, c.get('userId'), next.tags)) return { rejected: UNKNOWN_TAG };
      savePreset(tx, next);
      return { preset: next };
    });
    if (!updated) return c.json(PRESET_NOT_FOUND, 404);
    if ('rejected' in updated) return c.json(updated.rejected, 422);
    return c.json(updated.preset);
  })
  .delete('/:id', (c) => {
    const removed = c.get('db').transaction((tx) => {
      const preset = findOwnPreset(tx, c.get('userId'), c.req.param('id'));
      if (!preset) return undefined;
      deletePreset(tx, preset.id);
      return preset;
    });
    if (!removed) return c.json(PRESET_NOT_FOUND, 404);
    return c.body(null, 204);
  })
  .post('/:id/duplicate', zValidator('json', duplicateBodySchema), (c) => {
    const { id } = c.req.valid('json');
    const stored = c.get('db').transaction((tx) => {
      const source = findOwnPreset(tx, c.get('userId'), c.req.param('id'));
      if (!source) return undefined;
      const names = listOwnPresets(tx, c.get('userId')).map((preset) => preset.name);
      const now = nowIso();
      return store(tx, c.get('userId'), {
        ...source,
        id,
        name: duplicateName(source.name, names),
        createdAt: now,
        updatedAt: now,
      });
    });
    if (!stored) return c.json(PRESET_NOT_FOUND, 404);
    if ('rejected' in stored) return c.json(stored.rejected, 422);
    return c.json(stored.preset);
  });
