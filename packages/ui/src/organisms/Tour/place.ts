export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Spot extends Box {
  radius: number;
}

export type TooltipSide = 'above' | 'below';

export interface PlaceInput {
  spot: Box;
  area: Box;
  full: number;
  compact: number;
  avoid: readonly Box[];
  inSheet: boolean;
}

export interface Placement {
  left: number;
  top: number;
  width: number;
  side: TooltipSide;
  compact: boolean;
}

export const RING_PADDING = 4;
export const TOOLTIP_GAP = 12;
export const TOOLTIP_MARGIN = 8;
export const TOOLTIP_WIDTH = 288;

export const overlaps = (a: Box, b: Box): boolean =>
  a.left < b.left + b.width &&
  b.left < a.left + a.width &&
  a.top < b.top + b.height &&
  b.top < a.top + a.height;

export const sameBox = (a: Box, b: Box): boolean =>
  a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;

export function spotOf(target: Box, radius: number, area: Box): Spot {
  const left = Math.max(area.left, target.left - RING_PADDING);
  const top = Math.max(area.top, target.top - RING_PADDING);
  const right = Math.min(area.left + area.width, target.left + target.width + RING_PADDING);
  const bottom = Math.min(area.top + area.height, target.top + target.height + RING_PADDING);
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  return {
    left,
    top,
    width,
    height,
    radius: Math.max(0, Math.min(radius + RING_PADDING, width / 2, height / 2)),
  };
}

export const tooltipWidth = (area: Box): number =>
  Math.min(TOOLTIP_WIDTH, area.width - TOOLTIP_MARGIN * 2);

function distanceFrom(spot: Box, top: number, height: number): number {
  if (top + height <= spot.top) return spot.top - (top + height);
  return top - (spot.top + spot.height);
}

export function placeTooltip({ spot, area, full, compact, avoid, inSheet }: PlaceInput): Placement {
  const width = tooltipWidth(area);
  const left = Math.min(
    Math.max(spot.left + spot.width / 2 - width / 2, area.left + TOOLTIP_MARGIN),
    area.left + area.width - width - TOOLTIP_MARGIN,
  );
  const halo = {
    left: spot.left,
    top: spot.top - TOOLTIP_GAP,
    width: spot.width,
    height: spot.height + TOOLTIP_GAP * 2,
  };
  const blocked = [halo, ...avoid].filter((box) => box.width > 0 && box.height > 0);
  const lowerHalf = spot.top + spot.height / 2 > area.top + area.height / 2;
  const preferred: TooltipSide = lowerHalf ? 'above' : 'below';
  const sideOf = (top: number, height: number): TooltipSide =>
    top + height <= spot.top ? 'above' : 'below';
  const fits = (top: number, height: number): boolean =>
    top >= area.top + TOOLTIP_MARGIN &&
    top + height <= area.top + area.height - TOOLTIP_MARGIN &&
    !blocked.some((box) => overlaps({ left, top, width, height }, box));
  const heights = inSheet ? [full, compact] : [full];
  for (const height of heights) {
    const first = Math.ceil(area.top + TOOLTIP_MARGIN);
    const last = Math.floor(area.top + area.height - TOOLTIP_MARGIN - height);
    const tops = [
      spot.top - TOOLTIP_GAP - height,
      spot.top + spot.height + TOOLTIP_GAP,
      ...Array.from({ length: Math.max(0, last - first + 1) }, (_, index) => first + index),
    ];
    let best: { top: number; rank: number } | null = null;
    for (const top of tops) {
      if (!fits(top, height)) continue;
      const rank =
        Math.abs(distanceFrom(spot, top, height)) * 2 + (sideOf(top, height) === preferred ? 0 : 1);
      if (best === null || rank < best.rank) best = { top, rank };
    }
    if (best !== null) {
      return {
        left,
        top: best.top,
        width,
        side: sideOf(best.top, height),
        compact: height !== full,
      };
    }
  }
  const roomAbove = spot.top - area.top;
  const roomBelow = area.top + area.height - (spot.top + spot.height);
  const side: TooltipSide = roomAbove > roomBelow ? 'above' : 'below';
  const height = inSheet ? compact : full;
  const wanted =
    side === 'above' ? spot.top - TOOLTIP_GAP - height : spot.top + spot.height + TOOLTIP_GAP;
  const top = Math.min(
    Math.max(wanted, area.top + TOOLTIP_MARGIN),
    area.top + area.height - height - TOOLTIP_MARGIN,
  );
  return { left, top, width, side, compact: inSheet };
}
