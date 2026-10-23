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

  it('A hero at 0 HP or below is unconscious and dies at negative half max HP, rounded up', () => {
    expect(healthStatus(1, 30, 'hero')).toBe('staggered');
    expect(healthStatus(0, 30, 'hero')).toBe('unconscious');
    expect(healthStatus(-14, 30, 'hero')).toBe('unconscious');
    expect(healthStatus(-15, 30, 'hero')).toBe('dead');
    expect(healthStatus(-15, 31, 'hero')).toBe('unconscious');
    expect(healthStatus(-16, 31, 'hero')).toBe('dead');
  });

  it('An enemy or an ally dies at 0 HP', () => {
    expect(healthStatus(0, 30, 'enemy')).toBe('dead');
    expect(healthStatus(0, 30, 'ally')).toBe('dead');
    expect(healthStatus(1, 30, 'ally')).toBe('staggered');
  });
});

describe('healthSegments', () => {
  it('HP segments: Full 4, Wounded 3, Staggered 2 when HP ≥ 25% of max else 1, Dead 0.', () => {
    expect(healthSegments('full')).toBe(4);
    expect(healthSegments('wounded')).toBe(3);
    expect(healthSegments('staggered', 3, 10)).toBe(2);
    expect(healthSegments('staggered', 25, 100)).toBe(2);
    expect(healthSegments('staggered', 24, 100)).toBe(1);
    expect(healthSegments('staggered', 1, 10)).toBe(1);
    expect(healthSegments('unconscious')).toBe(0);
    expect(healthSegments('dead')).toBe(0);
  });

  it('shows 2 segments for a staggered unit whose HP is hidden', () => {
    expect(healthSegments('staggered')).toBe(2);
  });

  it('agrees with healthStatus on the boundaries', () => {
    expect(healthSegments(healthStatus(10, 10, 'enemy'), 10, 10)).toBe(4);
    expect(healthSegments(healthStatus(5, 10, 'enemy'), 5, 10)).toBe(3);
    expect(healthSegments(healthStatus(4, 10, 'enemy'), 4, 10)).toBe(2);
    expect(healthSegments(healthStatus(2, 10, 'enemy'), 2, 10)).toBe(1);
    expect(healthSegments(healthStatus(0, 10, 'enemy'), 0, 10)).toBe(0);
    expect(healthSegments(healthStatus(0, 10, 'hero'), 0, 10)).toBe(0);
  });
});
