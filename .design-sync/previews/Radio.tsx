import * as React from 'react';
import * as Stories from '@ds-stories/packages/ui/src/atoms/Radio/Radio.stories';

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

export const OnM = /* On, M */ compose(Stories, 'OnM');
export const Off = /* Off */ compose(Stories, 'Off');
export const On = /* On */ compose(Stories, 'On');
export const Tap = /* Tap */ compose(Stories, 'Tap');
export const Disabled = /* Disabled */ compose(Stories, 'Disabled');
export const OnDisabled = /* On, disabled */ compose(Stories, 'OnDisabled');
export const S = /* S */ compose(Stories, 'S');
export const M = /* M */ compose(Stories, 'M');
export const L = /* L */ compose(Stories, 'L');
export const ExtraSelect = /* Tap selects */ compose(Stories, 'ExtraSelect');
export const ExtraLabelClick = /* Label click selects */ compose(Stories, 'ExtraLabelClick');
export const ExtraKeyboard = /* Keyboard: Space selects */ compose(Stories, 'ExtraKeyboard');
export const ExtraGroupArrows = /* Group: arrow keys move the selection */ compose(
  Stories,
  'ExtraGroupArrows',
);
export const ExtraDisabledLabel = /* Disabled group */ compose(Stories, 'ExtraDisabledLabel');
export const ExtraLocaleDe = /* Locale de */ compose(Stories, 'ExtraLocaleDe');
export const ExtraLocaleEs = /* Locale es */ compose(Stories, 'ExtraLocaleEs');
export const ExtraLocaleFr = /* Locale fr */ compose(Stories, 'ExtraLocaleFr');
export const ExtraLocaleJa = /* Locale ja */ compose(Stories, 'ExtraLocaleJa');
export const ExtraLocaleRu = /* Locale ru */ compose(Stories, 'ExtraLocaleRu');
