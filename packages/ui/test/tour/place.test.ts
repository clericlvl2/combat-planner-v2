import { describe, expect, it } from 'vite-plus/test';
import {
  RING_PADDING,
  TOOLTIP_GAP,
  TOOLTIP_MARGIN,
  placeTooltip,
  spotOf,
  unionOf,
} from '../../src/organisms/Tour/place.ts';
import type { Box } from '../../src/organisms/Tour/place.ts';

const area: Box = { left: 0, top: 0, width: 320, height: 568 };

describe('spotOf', () => {
  it('pads the target and its radius', () => {
    expect(spotOf({ left: 20, top: 100, width: 80, height: 40 }, 12, area)).toEqual({
      left: 20 - RING_PADDING,
      top: 100 - RING_PADDING,
      width: 80 + RING_PADDING * 2,
      height: 40 + RING_PADDING * 2,
      radius: 12 + RING_PADDING,
    });
  });

  it('caps the radius at half the shorter side', () => {
    expect(spotOf({ left: 20, top: 100, width: 80, height: 40 }, 999, area).radius).toBe(24);
  });

  it('keeps the ring inside the area', () => {
    const spot = spotOf({ left: 0, top: 0, width: 320, height: 44 }, 0, area);
    expect(spot).toMatchObject({ left: 0, top: 0, width: 320, height: 44 + RING_PADDING });
  });
});

describe('unionOf', () => {
  it('spans every box', () => {
    const keys = { left: 16, top: 200, width: 288, height: 148 };
    const damage = { left: 16, top: 420, width: 288, height: 56 };
    const heal = { left: 16, top: 484, width: 92, height: 48 };
    expect(unionOf([keys, damage, heal])).toEqual({ left: 16, top: 200, width: 288, height: 332 });
  });
});

describe('placeTooltip', () => {
  const base = { area, full: 140, compact: 96, inSheet: false };

  it('places the tooltip below a target in the upper half', () => {
    const spot = { left: 20, top: 60, width: 100, height: 50 };
    const placed = placeTooltip({ ...base, spot });
    expect(placed).toMatchObject({ side: 'below', top: 60 + 50 + TOOLTIP_GAP, compact: false });
    expect(placed.width).toBe(288);
    expect(placed.left).toBe(TOOLTIP_MARGIN);
  });

  it('places the tooltip right above a target in the lower half', () => {
    const spot = { left: 24, top: 470, width: 272, height: 66 };
    const placed = placeTooltip({ ...base, spot });
    expect(placed).toMatchObject({ side: 'above', top: 470 - TOOLTIP_GAP - 140, compact: false });
  });

  it('sits right above a sheet button at the bottom whatever lies between', () => {
    const spot = { left: 12, top: 500, width: 296, height: 56 };
    const placed = placeTooltip({ ...base, spot, inSheet: true });
    expect(placed).toMatchObject({ side: 'above', top: 500 - TOOLTIP_GAP - 140, compact: false });
  });

  it('centres on the target within the margins', () => {
    const spot = { left: 260, top: 8, width: 52, height: 52 };
    const placed = placeTooltip({ ...base, spot });
    expect(placed.left + placed.width).toBe(320 - TOOLTIP_MARGIN);
  });

  it('moves to the other side when the roomier side is too short for it', () => {
    const spot = { left: 20, top: 300, width: 280, height: 160 };
    const placed = placeTooltip({ ...base, spot, full: 120 });
    expect(placed).toMatchObject({ side: 'above', top: 300 - TOOLTIP_GAP - 120, compact: false });
  });

  it('turns compact inside a sheet only when the full tooltip fits on neither side', () => {
    const spot = { left: 12, top: 200, width: 296, height: 300 };
    const placed = placeTooltip({ ...base, spot, inSheet: true, full: 190, compact: 56 });
    expect(placed).toMatchObject({ side: 'above', top: 200 - TOOLTIP_GAP - 56, compact: true });
  });

  it('stays full outside a sheet and falls back to the roomier side', () => {
    const spot = { left: 12, top: 100, width: 296, height: 360 };
    const placed = placeTooltip({ ...base, spot });
    expect(placed.compact).toBe(false);
    expect(placed.side).toBe('below');
    expect(placed.top).toBe(568 - 140 - TOOLTIP_MARGIN);
  });

  it('falls back to a compact tooltip clamped into the area inside a sheet', () => {
    const spot = { left: 12, top: 40, width: 296, height: 480 };
    const placed = placeTooltip({ ...base, spot, inSheet: true });
    expect(placed.compact).toBe(true);
    expect(placed.top).toBeGreaterThanOrEqual(TOOLTIP_MARGIN);
    expect(placed.top + 96).toBeLessThanOrEqual(568 - TOOLTIP_MARGIN);
  });
});
