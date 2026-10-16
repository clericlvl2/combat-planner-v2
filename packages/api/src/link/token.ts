import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CombatId } from '@combat-planner/domain';
import { ulidSchema } from '@combat-planner/domain';
import type { LinkToken } from '../client.ts';

export interface LinkClaims {
  combatId: CombatId;
  generation: number;
}

const GENERATION = /^(0|[1-9]\d*)$/;

const signatureOf = (combatId: CombatId, generation: number, secret: string): string =>
  createHmac('sha256', secret).update(`${combatId}:${generation}`).digest('base64url');

export const signLink = ({ combatId, generation }: LinkClaims, secret: string): LinkToken =>
  `${combatId}.${generation}.${signatureOf(combatId, generation, secret)}`;

export function verifyLink(
  token: LinkToken,
  secret: string,
  current?: LinkClaims,
): LinkClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [combatId, generationText, given] = parts;
  if (combatId === undefined || generationText === undefined || given === undefined) return null;
  if (!ulidSchema.safeParse(combatId).success || !GENERATION.test(generationText)) return null;
  const generation = Number(generationText);
  if (!Number.isSafeInteger(generation)) return null;
  const expected = Buffer.from(signatureOf(combatId, generation, secret));
  const actual = Buffer.from(given);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  if (current && (current.combatId !== combatId || current.generation !== generation)) return null;
  return { combatId, generation };
}
