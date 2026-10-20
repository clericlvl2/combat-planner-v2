import { describe, expect, it, vi } from 'vite-plus/test';
import { OPEN_DISTANCE, watchEdgeSwipe } from './edgeSwipe.ts';
import { swipeAllowed } from './swipeGuard.ts';
import type { SwipeRoot } from './swipeGuard.ts';

type Attributes = Record<string, string>;

const matches = (attributes: Attributes, selector: string): boolean => {
  const parsed = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(selector.trim());
  if (!parsed) throw new Error(`unsupported selector ${selector}`);
  const [, name = '', value] = parsed;
  return name in attributes && (value === undefined || attributes[name] === value);
};

const documentWith = (...elements: Attributes[]): SwipeRoot => ({
  querySelector: (selectors: string) =>
    elements.some((attributes) =>
      selectors.split(',').some((selector) => matches(attributes, selector)),
    )
      ? ({} as Element)
      : null,
});

const gutter: Attributes = { class: 'gutter' };
const openSheet: Attributes[] = [{ 'data-scrim': '' }, { role: 'dialog', 'aria-modal': 'true' }];
const openDialog: Attributes[] = [
  { 'data-scrim': '', 'aria-hidden': 'true' },
  { 'aria-modal': 'true' },
];
const openDrawer: Attributes[] = [{ 'aria-modal': 'true' }];
const systemScreen: Attributes[] = [{ 'data-system-screen': '' }];

const swipeOver = (root: SwipeRoot) => {
  const target = new EventTarget();
  const onSwipe = vi.fn();
  watchEdgeSwipe(target, { onSwipe, canStart: () => swipeAllowed(root) });
  const send = (type: string, clientX: number) =>
    target.dispatchEvent(
      Object.assign(new Event(type), {
        pointerId: 1,
        pointerType: 'touch',
        clientX,
        clientY: 300,
        button: 0,
      }),
    );
  send('pointerdown', 8);
  send('pointermove', 8 + OPEN_DISTANCE * 2);
  send('pointerup', 8 + OPEN_DISTANCE * 2);
  return onSwipe;
};

describe('swipeAllowed', () => {
  it('lets the swipe open the drawer on a plain page', () => {
    expect(swipeAllowed(documentWith(gutter))).toBe(true);
    expect(swipeOver(documentWith(gutter))).toHaveBeenCalledOnce();
  });

  it.each([
    ['a Sheet', openSheet],
    ['a Dialog', openDialog],
    ['a Drawer', openDrawer],
  ])('refuses a swipe over the scrim or gutter while %s is open', (_, modal) => {
    const root = documentWith(gutter, ...modal);
    expect(swipeAllowed(root)).toBe(false);
    expect(swipeOver(root)).not.toHaveBeenCalled();
  });

  it('refuses a swipe while only a scrim is mounted', () => {
    expect(swipeOver(documentWith(gutter, { 'data-scrim': '' }))).not.toHaveBeenCalled();
  });

  it('refuses a swipe while a system screen is mounted', () => {
    const root = documentWith(gutter, ...systemScreen);
    expect(swipeAllowed(root)).toBe(false);
    expect(swipeOver(root)).not.toHaveBeenCalled();
  });

  it('ignores aria-modal set to false', () => {
    expect(swipeAllowed(documentWith(gutter, { 'aria-modal': 'false' }))).toBe(true);
  });
});
