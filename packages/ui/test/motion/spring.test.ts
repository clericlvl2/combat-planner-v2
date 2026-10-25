import { describe, expect, it } from 'vite-plus/test';
import { layout } from '../../src/layout.ts';
import { sampleSpring, springAt } from '../../src/motion/spring.ts';

const spring = layout.turnSpring;

describe('sampleSpring', () => {
  it('settles at the target', () => {
    const samples = sampleSpring(spring, -80, 0);
    const last = samples.at(-1);
    expect(last).toMatchObject({ x: 0, v: 0 });
    expect(last?.t ?? Infinity).toBeLessThan(1);
    expect(samples[0]?.x).toBe(-80);
    expect(samples[0]?.v).toBeCloseTo(0, 10);
  });

  it('overshoots an 80 px step by about 4.5 px', () => {
    const overshoot = Math.max(...sampleSpring(spring, -80, 0).map((sample) => sample.x));
    expect(overshoot).toBeGreaterThan(4.2);
    expect(overshoot).toBeLessThan(4.8);
  });

  it('continues a move from the current position and velocity', () => {
    const step = 1 / 120;
    const firstTarget = 0;
    const mid = springAt(spring, -80, 0, 0.05);
    const position = firstTarget + mid.x;
    const secondTarget = firstTarget + 60;
    const restarted = sampleSpring(spring, position - secondTarget, mid.v, { step });
    const start = restarted[0];
    const next = restarted[1];
    if (!start || !next) throw new Error('no samples');
    expect(secondTarget + start.x).toBeCloseTo(position, 10);
    expect(start.v).toBeCloseTo(mid.v, 10);
    const moved = next.x - start.x;
    expect(Math.sign(moved)).toBe(Math.sign(mid.v));
    expect(Math.abs(moved)).toBeLessThan(Math.abs(mid.v) * step * 1.5);
    expect(Math.abs(moved)).toBeGreaterThan(Math.abs(mid.v) * step * 0.5);
  });

  it('matches the oscillator equation', () => {
    const t = 0.03;
    const h = 1e-5;
    const { x, v } = springAt(spring, -80, 20, t);
    const ahead = springAt(spring, -80, 20, t + h);
    const behind = springAt(spring, -80, 20, t - h);
    expect((ahead.x - behind.x) / (2 * h)).toBeCloseTo(v, 3);
    const acceleration = (ahead.v - behind.v) / (2 * h);
    expect(acceleration).toBeCloseTo(-(spring.stiffness * x + spring.damping * v) / spring.mass, 0);
  });
});
