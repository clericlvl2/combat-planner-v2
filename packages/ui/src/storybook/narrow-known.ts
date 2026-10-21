import type { GeometryCheck } from './geometry.ts';

export type NarrowCheck = GeometryCheck | 'play';

export interface NarrowKnown {
  readonly story: string;
  readonly check: NarrowCheck;
}

const ru: readonly NarrowKnown[] = [];

export const narrowKnown: readonly NarrowKnown[] = ru;
