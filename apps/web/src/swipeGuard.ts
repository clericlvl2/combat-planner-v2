export const SWIPE_BLOCKERS = '[aria-modal="true"], [data-scrim], [data-system-screen]';

export type SwipeRoot = Pick<ParentNode, 'querySelector'>;

export const swipeAllowed = (root: SwipeRoot): boolean =>
  root.querySelector(SWIPE_BLOCKERS) === null;
