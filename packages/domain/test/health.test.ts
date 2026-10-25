import { describe, expect, it } from 'vite-plus/test';
import { healthSegments, healthStatus } from '../src/index.ts';

describe('healthStatus', () => {
  it('Health status: HP ≤ 0 → Dead; HP ≥ max → Full; HP ≥ 50% of max → Wounded; otherwise Staggered.', () => {
    expect(healthStatus(0, 10, 'enemy')).toBe('dead');
    expect(healthStatus(-5, 10, 'enemy')).toBe('dead');
    expect(healthStatus(10, 10, 'enemy')).toBe('full');
    expect(healthStatus(12, 10, 'enemy')).toBe('full');
    expect(healthStatus(9, 10, 'enemy')).toBe('wounded');
    expect(healthStatus(5, 10, 'enemy')).toBe('wounded');
    expect(healthStatus(5, 11, 'enemy')).toBe('staggered');
    expect(healthStatus(4, 10, 'enemy')).toBe('staggered');
    expect(healthStatus(1, 10, 'enemy')).toBe('staggered');
    expect(healthStatus(1, 1, 'enemy')).toBe('full');
  });

  it('A hero at 0 HP or below is unconscious, never dead', () => {
    expect(healthStatus(1, 30, 'hero')).toBe('staggered');
    expect(healthStatus(0, 30, 'hero')).toBe('unconscious');
    expect(healthStatus(-14, 30, 'hero')).toBe('unconscious');
    expect(healthStatus(-15, 30, 'hero')).toBe('unconscious');
    expect(healthStatus(-30, 30, 'hero')).toBe('unconscious');
    expect(healthStatus(-16, 31, 'hero')).toBe('unconscious');
  });

  it('An enemy or an ally dies at 0 HP', () => {
    expect(healthStatus(0, 30, 'enemy')).toBe('dead');
    expect(healthStatus(0, 30, 'ally')).toBe('dead');
    expect(healthStatus(1, 30, 'ally')).toBe('staggered');
  });
});

describe('healthSegments', () => {
  it('HP segments: Full and Wounded 2, Staggered 1, Unconscious and Dead 0.', () => {
    expect(healthSegments('full')).toBe(2);
    expect(healthSegments('wounded')).toBe(2);
    expect(healthSegments('staggered')).toBe(1);
    expect(healthSegments('unconscious')).toBe(0);
    expect(healthSegments('dead')).toBe(0);
  });

  const segmentsOf = (hp: number, maxHp: number, role: 'hero' | 'enemy') =>
    healthSegments(healthStatus(hp, maxHp, role));

  it.each(['hero', 'enemy'] as const)('keeps two segments down to half max HP for a %s', (role) => {
    expect(segmentsOf(40, 40, role)).toBe(2);
    expect(segmentsOf(39, 40, role)).toBe(2);
    expect(segmentsOf(20, 40, role)).toBe(2);
    expect(segmentsOf(19, 40, role)).toBe(1);
    expect(segmentsOf(1, 40, role)).toBe(1);
  });

  it('rounds half of an odd max HP up', () => {
    expect(segmentsOf(21, 41, 'enemy')).toBe(2);
    expect(segmentsOf(20, 41, 'enemy')).toBe(1);
  });

  it('shows no segments at 0 HP and below', () => {
    expect(segmentsOf(0, 40, 'hero')).toBe(0);
    expect(segmentsOf(-5, 40, 'hero')).toBe(0);
    expect(segmentsOf(-20, 40, 'hero')).toBe(0);
    expect(segmentsOf(0, 40, 'enemy')).toBe(0);
    expect(segmentsOf(-5, 40, 'enemy')).toBe(0);
  });
});
