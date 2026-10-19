import { describe, expect, it } from 'vite-plus/test';
import { healthSegments, healthStatus } from '../src/index.ts';

describe('healthStatus', () => {
  it('Health status: HP ≤ 0 → Dead; HP ≥ max → Full; HP ≥ 50% of max → Wounded; otherwise Staggered.', () => {
    expect(healthStatus(0, 10)).toBe('dead');
    expect(healthStatus(-5, 10)).toBe('dead');
    expect(healthStatus(10, 10)).toBe('full');
    expect(healthStatus(12, 10)).toBe('full');
    expect(healthStatus(9, 10)).toBe('wounded');
    expect(healthStatus(5, 10)).toBe('wounded');
    expect(healthStatus(5, 11)).toBe('staggered');
    expect(healthStatus(4, 10)).toBe('staggered');
    expect(healthStatus(1, 10)).toBe('staggered');
    expect(healthStatus(1, 1)).toBe('full');
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
    expect(healthSegments('dead')).toBe(0);
  });

  it('shows 2 segments for a staggered unit whose HP is hidden', () => {
    expect(healthSegments('staggered')).toBe(2);
  });

  it('agrees with healthStatus on the boundaries', () => {
    expect(healthSegments(healthStatus(10, 10), 10, 10)).toBe(4);
    expect(healthSegments(healthStatus(5, 10), 5, 10)).toBe(3);
    expect(healthSegments(healthStatus(4, 10), 4, 10)).toBe(2);
    expect(healthSegments(healthStatus(2, 10), 2, 10)).toBe(1);
    expect(healthSegments(healthStatus(0, 10), 0, 10)).toBe(0);
  });
});
