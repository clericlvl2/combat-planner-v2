const viewports = { narrow: 320, phone: 390, desktop: 1280 } as const;

export type Viewport = keyof typeof viewports;

export const layout = {
  phone: { width: viewports.phone, height: 844 },
  viewports,
  statusBar: 44,
  combatHeader: 126,
  playerHeader: { statusBar: 44, minBody: 82 },
  pageHeader: { height: 168, statusBar: 44, nav: 48, search: 48, bottom: 12 },
  contentEdge: 12,
  listGap: 8,
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
} as const;
