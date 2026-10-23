import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { addons } from 'storybook/manager-api';
import type { API } from 'storybook/manager-api';
import { layout } from '../src/layout.ts';

type Globals = Record<string, unknown>;

interface GlobalsEvent {
  globals?: Globals;
  storyGlobals?: Globals;
}

const frames: readonly string[] = Object.keys(layout.viewports);

function viewportMatches(viewport: unknown, frame: string): boolean {
  if (typeof viewport === 'string') return viewport === frame;
  if (typeof viewport !== 'object' || viewport === null) return false;
  const { value, isRotated } = viewport as { value?: unknown; isRotated?: unknown };
  return value === frame && isRotated !== true;
}

function followFrame(api: API, { globals = {}, storyGlobals = {} }: GlobalsEvent): void {
  const frame = globals.frame;
  if (typeof frame !== 'string' || !frames.includes(frame)) return;
  if ('viewport' in storyGlobals) return;
  if (viewportMatches(globals.viewport, frame)) return;
  api.updateGlobals({ viewport: { value: frame, isRotated: false } });
}

addons.setConfig({ toolbar: { 'storybook/viewport/tool': { hidden: true } } });

addons.register('combat-planner/frame-viewport', (api) => {
  api.on(SET_GLOBALS, (event: GlobalsEvent) => followFrame(api, event));
  api.on(GLOBALS_UPDATED, (event: GlobalsEvent) => followFrame(api, event));
});
