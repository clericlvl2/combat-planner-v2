import type { HealthStatus, Role } from './types.ts';

export type HealthSegments = 0 | 1 | 2;

export const healthStatus = (hp: number, maxHp: number, role: Role): HealthStatus => {
  if (hp <= 0) return role === 'hero' ? 'unconscious' : 'dead';
  if (hp >= maxHp) return 'full';
  if (hp * 2 >= maxHp) return 'wounded';
  return 'staggered';
};

export const healthSegments = (status: HealthStatus): HealthSegments => {
  switch (status) {
    case 'full':
    case 'wounded':
      return 2;
    case 'staggered':
      return 1;
    case 'unconscious':
    case 'dead':
      return 0;
  }
};
