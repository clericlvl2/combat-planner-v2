import { describe, expect, it } from 'vite-plus/test';
import {
  RING_PADDING,
  TOOLTIP_GAP,
  TOOLTIP_MARGIN,
  overlaps,
  placeTooltip,
  spotOf,
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

describe('placeTooltip', () => {
  const base = { area, full: 140, compact: 96, avoid: [], inSheet: false };

  it('places the tooltip below a target in the upper half', () => {
    const spot = { left: 20, top: 60, width: 100, height: 50 };
    const placed = placeTooltip({ ...base, spot });
    expect(placed).toMatchObject({ side: 'below', top: 60 + 50 + TOOLTIP_GAP, compact: false });
    expect(placed.width).toBe(288);
    expect(placed.left).toBe(TOOLTIP_MARGIN);
  });

  it('places the tooltip above a target in the lower half', () => {
    const spot = { left: 24, top: 470, width: 272, height: 66 };
    const placed = placeTooltip({ ...base, spot });
    expect(placed).toMatchObject({ side: 'above', top: 470 - TOOLTIP_GAP - 140, compact: false });
  });

  it('centres on the target within the margins', () => {
    const spot = { left: 260, top: 8, width: 52, height: 52 };
    const placed = placeTooltip({ ...base, spot });
    expect(placed.left + placed.width).toBe(320 - TOOLTIP_MARGIN);
  });

  it('moves to the other side to keep off sheet actions', () => {
    const spot = { left: 20, top: 200, width: 100, height: 40 };
    const action = { left: 12, top: 260, width: 296, height: 56 };
    const placed = placeTooltip({ ...base, spot, avoid: [action] });
    expect(placed.side).toBe('above');
    expect(overlaps({ ...placed, height: 140 }, action)).toBe(false);
  });

  it('turns compact inside a sheet when the full tooltip would cover controls', () => {
    const spot = { left: 12, top: 462, width: 296, height: 68 };
    const keypad = { left: 16, top: 100, width: 288, height: 230 };
    const placed = placeTooltip({ ...base, spot, avoid: [keypad], inSheet: true, full: 160 });
    expect(placed.compact).toBe(true);
    expect(placed.side).toBe('above');
    expect(overlaps({ ...placed, height: 96 }, keypad)).toBe(false);
  });

  it('stays full outside a sheet and falls back to the roomier side', () => {
    const spot = { left: 12, top: 100, width: 296, height: 360 };
    const placed = placeTooltip({ ...base, spot });
    expect(placed.compact).toBe(false);
    expect(placed.side).toBe('below');
    expect(placed.top).toBe(568 - 140 - TOOLTIP_MARGIN);
  });

  it('finds the free strip above a tall sheet for a compact tooltip', () => {
    const spot = { left: 12, top: 436, width: 296, height: 120 };
    const sheet = { left: 12, top: 76, width: 296, height: 340 };
    const placed = placeTooltip({ ...base, spot, avoid: [sheet], inSheet: true, compact: 56 });
    expect(placed.compact).toBe(true);
    expect(placed.top).toBeGreaterThanOrEqual(TOOLTIP_MARGIN);
    expect(placed.top + 56).toBeLessThanOrEqual(76);
  });

  it('uses the gap between sheet controls nearest to the target', () => {
    const spot = { left: 12, top: 450, width: 296, height: 100 };
    const close = { left: 256, top: 30, width: 48, height: 48 };
    const keypad = { left: 16, top: 200, width: 288, height: 240 };
    const placed = placeTooltip({
      ...base,
      spot,
      avoid: [close, keypad],
      inSheet: true,
      compact: 56,
    });
    expect(placed).toMatchObject({ compact: true, top: 200 - 56, side: 'above' });
  });

  it('falls back to a compact tooltip clamped into the area inside a sheet', () => {
    const spot = { left: 12, top: 40, width: 296, height: 480 };
    const placed = placeTooltip({ ...base, spot, inSheet: true });
    expect(placed.compact).toBe(true);
    expect(placed.top).toBeGreaterThanOrEqual(TOOLTIP_MARGIN);
    expect(placed.top + 96).toBeLessThanOrEqual(568 - TOOLTIP_MARGIN);
  });
});
