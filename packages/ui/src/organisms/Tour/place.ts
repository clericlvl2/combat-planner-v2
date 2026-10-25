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

export function unionOf(boxes: readonly Box[]): Box {
  const left = Math.min(...boxes.map((box) => box.left));
  const top = Math.min(...boxes.map((box) => box.top));
  const right = Math.max(...boxes.map((box) => box.left + box.width));
  const bottom = Math.max(...boxes.map((box) => box.top + box.height));
  return { left, top, width: right - left, height: bottom - top };
}

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

export function placeTooltip({ spot, area, full, compact, inSheet }: PlaceInput): Placement {
  const width = tooltipWidth(area);
  const left = Math.min(
    Math.max(spot.left + spot.width / 2 - width / 2, area.left + TOOLTIP_MARGIN),
    area.left + area.width - width - TOOLTIP_MARGIN,
  );
  const roomAbove = spot.top - area.top;
  const roomBelow = area.top + area.height - (spot.top + spot.height);
  const side: TooltipSide = roomAbove > roomBelow ? 'above' : 'below';
  const sides: TooltipSide[] = [side, side === 'above' ? 'below' : 'above'];
  const topOf = (at: TooltipSide, height: number): number =>
    at === 'above' ? spot.top - TOOLTIP_GAP - height : spot.top + spot.height + TOOLTIP_GAP;
  const fits = (top: number, height: number): boolean =>
    top >= area.top + TOOLTIP_MARGIN && top + height <= area.top + area.height - TOOLTIP_MARGIN;
  const heights = inSheet ? [full, compact] : [full];
  for (const height of heights) {
    for (const next of sides) {
      const top = topOf(next, height);
      if (fits(top, height)) return { left, top, width, side: next, compact: height !== full };
    }
  }
  const height = inSheet ? compact : full;
  const top = Math.min(
    Math.max(topOf(side, height), area.top + TOOLTIP_MARGIN),
    area.top + area.height - height - TOOLTIP_MARGIN,
  );
  return { left, top, width, side, compact: inSheet };
}
