import * as React from 'react';
import * as Stories from '@ds-stories/packages/ui/src/atoms/Swatch/Swatch.stories';

function compose(S: any, key: string) {
  const meta: any = S.default ?? {};
  const st: any = S[key];
  const args: any = { ...meta.args, ...(st && st.args ? st.args : {}) };
  // Storybook resolves argTypes.mapping (control value -> real arg) before
  // rendering; mirror that so mapped args don't render raw.
  const at: any = { ...meta.argTypes, ...(st && st.argTypes ? st.argTypes : {}) };
  for (const k of Object.keys(args)) {
    const m = at[k] && at[k].mapping;
    if (m && typeof m === 'object' && args[k] in m) args[k] = m[args[k]];
  }
  const title: string = typeof meta.title === 'string' ? meta.title : '';
  const ctx: any = {
    args,
    name: key,
    title,
    kind: title,
    id: '',
    componentId: '',
    globals: {},
    viewMode: 'story',
    parameters: (st && st.parameters) ?? meta.parameters ?? {},
  };
  let render: (() => any) | null = null;
  if (st && typeof st.render === 'function') render = () => st.render(args, ctx);
  else if (typeof st === 'function') render = () => st(args, ctx);
  else if (typeof meta.render === 'function') render = () => meta.render(args, ctx);
  else {
    const C = (st && st.component) || meta.component;
    if (C) render = () => React.createElement(C, args);
  }
  if (!render) return () => null;
  // [].concat: a single function is legal CSF decorator shorthand. A
  // decorator returning undefined (stubbed addon) falls through to the inner
  // render — otherwise one unrecognized addon blanks the cell silently.
  const decorators: any[] = ([] as any[])
    .concat((st && st.decorators) ?? [])
    .concat(meta.decorators ?? []);
  return decorators.reduce(
    (inner: any, dec: any) => () => {
      const out = dec(inner, ctx);
      return out === undefined ? inner() : out;
    },
    render,
  );
}

export const SelectedM = /* Selected, M */ compose(Stories, 'SelectedM');
export const Colour1 = /* Colour 1 */ compose(Stories, 'Colour1');
export const Colour2 = /* Colour 2 */ compose(Stories, 'Colour2');
export const Colour3 = /* Colour 3 */ compose(Stories, 'Colour3');
export const Colour4 = /* Colour 4 */ compose(Stories, 'Colour4');
export const Colour5 = /* Colour 5 */ compose(Stories, 'Colour5');
export const Colour6 = /* Colour 6 */ compose(Stories, 'Colour6');
export const Colour7 = /* Colour 7 */ compose(Stories, 'Colour7');
export const Colour8 = /* Colour 8 */ compose(Stories, 'Colour8');
export const Selected = /* Selected */ compose(Stories, 'Selected');
export const Tap = /* Tap */ compose(Stories, 'Tap');
export const S = /* S */ compose(Stories, 'S');
export const M = /* M */ compose(Stories, 'M');
export const L = /* L */ compose(Stories, 'L');
export const ExtraSelect = /* Select */ compose(Stories, 'ExtraSelect');
export const ExtraKeyboard = /* Keyboard: Enter and Space */ compose(Stories, 'ExtraKeyboard');
export const ExtraDisabled = /* Disabled */ compose(Stories, 'ExtraDisabled');
export const ExtraLocaleRu = /* Locale ru */ compose(Stories, 'ExtraLocaleRu');
export const ExtraLocaleJa = /* Locale ja */ compose(Stories, 'ExtraLocaleJa');
