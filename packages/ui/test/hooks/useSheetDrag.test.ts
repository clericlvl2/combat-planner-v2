import { describe, expect, it } from 'vite-plus/test';
import { dragOffset, trackSheetDrag } from '../../src/hooks/useSheetDrag.ts';
import { layout } from '../../src/layout.ts';

const HEIGHT = 400;

const swipe = (points: readonly (readonly [number, number])[]) => {
  const [first, ...rest] = points;
  const tracker = trackSheetDrag(first?.[0] ?? 0, first?.[1] ?? 0);
  for (const [y, t] of rest) tracker.move(y, t);
  return tracker.release(HEIGHT);
};

const steady = (distance: number, duration: number, steps = 10) =>
  Array.from(
    { length: steps + 1 },
    (_, index) => [100 + (distance * index) / steps, (duration * index) / steps] as const,
  );

describe('trackSheetDrag', () => {
  it('closes past 30 % of the sheet height on a slow drag', () => {
    const release = swipe(steady(HEIGHT * 0.35, 2000));
    expect(release.velocity).toBeLessThan(layout.sheetFlickVelocity);
    expect(release.close).toBe(true);
  });

  it('stays open below 30 % on a slow drag', () => {
    const release = swipe(steady(HEIGHT * 0.25, 2000));
    expect(release.offset).toBeCloseTo(HEIGHT * 0.25);
    expect(release.close).toBe(false);
  });

  it('closes on a short fast flick', () => {
    const release = swipe(steady(60, 80));
    expect(release.velocity).toBeGreaterThan(layout.sheetFlickVelocity);
    expect(release.close).toBe(true);
  });

  it('measures velocity over the last moves only', () => {
    const release = swipe([...steady(60, 60), [160, 1000], [162, 1040]]);
    expect(release.velocity).toBeCloseTo(0.05);
    expect(release.close).toBe(false);
  });

  it('stays open when a fast move ends above the start', () => {
    const release = swipe([
      [100, 0],
      [140, 40],
      [90, 80],
    ]);
    expect(release.offset).toBeLessThan(0);
    expect(release.close).toBe(false);
  });

  it('damps an upward drag to the rubber band', () => {
    expect(dragOffset(30)).toBe(30);
    expect(dragOffset(-10)).toBeLessThan(0);
    expect(dragOffset(-10)).toBeGreaterThan(-10);
    expect(dragOffset(-1000)).toBeGreaterThanOrEqual(-layout.sheetRubberBand);
  });
});
