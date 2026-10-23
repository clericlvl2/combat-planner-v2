const viewports = {
  narrow: { width: 320, height: 568 },
  phone: { width: 384, height: 832 },
  large: { width: 440, height: 956 },
  desktop: { width: 1280, height: 844 },
} as const;

export type Viewport = keyof typeof viewports;

export const layout = {
  viewports,
  ranges: { regularMinWidth: 384, tallMinHeight: 700 },
  column: { width: 440, height: 956 },
  statusBar: 44,
  contentEdge: 12,
  listGap: 8,
  listInset: { top: 16, bottom: 44 },
  bottomBar: {
    height: 98,
    padding: { top: 10, right: 28, bottom: 28, left: 28 },
    borderTop: 2,
  },
  bottomButton: { height: 58, radius: 29, edge: 28 },
  sheet: { inset: 12, border: 2, radius: 24, padding: 14 },
  dialog: { inset: 24, padding: 16 },
  toast: { inset: 12, aboveBar: 12, withoutBar: 24, bottom: 110 },
  drawer: { width: 300, padding: { top: 56, right: 12, bottom: 28, left: 12 } },
  tapTarget: 44,
  scrollShadow: 12,
  scrollbar: 6,
} as const;
