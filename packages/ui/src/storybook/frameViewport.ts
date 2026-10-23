import { layout } from '../layout.ts';
import type { Viewport } from '../layout.ts';

export interface FrameViewport {
  value: string;
  isRotated: false;
}

export type ResizeTestPage = (width: number, height: number) => Promise<void>;

interface FrameGlobals {
  globals: Record<string, unknown>;
  storyGlobals?: Record<string, unknown>;
}

let resizeTestPage: ResizeTestPage | null = null;

const isViewport = (value: unknown): value is Viewport =>
  typeof value === 'string' && Object.hasOwn(layout.viewports, value);

export const frameViewportOf = (frame: unknown): Viewport => (isViewport(frame) ? frame : 'narrow');

export const frameViewport = (frame: string): FrameViewport => ({ value: frame, isRotated: false });

export function viewportMatches(viewport: unknown, frame: string): boolean {
  if (typeof viewport === 'string') return viewport === frame;
  if (typeof viewport !== 'object' || viewport === null) return false;
  const { value, isRotated } = viewport as { value?: unknown; isRotated?: unknown };
  return value === frame && isRotated !== true;
}

export const setResizeTestPage = (resize: ResizeTestPage): void => {
  resizeTestPage = resize;
};

export async function followFrameInTests({
  globals,
  storyGlobals = {},
}: FrameGlobals): Promise<void> {
  if (resizeTestPage === null || 'viewport' in storyGlobals) return;
  const frame = frameViewportOf(globals.frame);
  if (viewportMatches(globals.viewport, frame)) return;
  const { width, height } = layout.viewports[frame];
  await resizeTestPage(width, height);
}
