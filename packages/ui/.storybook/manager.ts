import { GLOBALS_UPDATED, SET_GLOBALS } from 'storybook/internal/core-events';
import { addons } from 'storybook/manager-api';
import type { API } from 'storybook/manager-api';
import { layout } from '../src/layout.ts';
import { frameViewport, viewportMatches } from '../src/storybook/frameViewport.ts';

type Globals = Record<string, unknown>;

interface GlobalsEvent {
  globals?: Globals;
  storyGlobals?: Globals;
}

const frames: readonly string[] = Object.keys(layout.viewports);

function followFrame(api: API, { globals = {}, storyGlobals = {} }: GlobalsEvent): void {
  const frame = globals.frame;
  if (typeof frame !== 'string' || !frames.includes(frame)) return;
  if ('viewport' in storyGlobals) return;
  if (viewportMatches(globals.viewport, frame)) return;
  api.updateGlobals({ viewport: frameViewport(frame) });
}

addons.setConfig({ toolbar: { 'storybook/viewport/tool': { hidden: true } } });

addons.register('combat-planner/frame-viewport', (api) => {
  api.on(SET_GLOBALS, (event: GlobalsEvent) => followFrame(api, event));
  api.on(GLOBALS_UPDATED, (event: GlobalsEvent) => followFrame(api, event));
});
