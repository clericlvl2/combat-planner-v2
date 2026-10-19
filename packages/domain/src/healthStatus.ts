import type { HealthStatus } from './types.ts';

export type HealthSegments = 0 | 1 | 2 | 3 | 4;

export const healthStatus = (hp: number, maxHp: number): HealthStatus => {
  if (hp <= 0) return 'dead';
  if (hp >= maxHp) return 'full';
  if (hp * 2 >= maxHp) return 'wounded';
  return 'staggered';
};

export const healthSegments = (
  status: HealthStatus,
  hp?: number,
  maxHp?: number,
): HealthSegments => {
  switch (status) {
    case 'full':
      return 4;
    case 'wounded':
      return 3;
    case 'staggered':
      return hp !== undefined && maxHp !== undefined && hp * 4 < maxHp ? 1 : 2;
    case 'dead':
      return 0;
  }
};
