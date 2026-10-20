import { expect } from 'storybook/test';
import { layout } from '../layout.ts';

export type GeometryCheck = 'overflow' | 'tapTargets' | 'frame' | 'truncation' | 'overlays';

export type GeometryOptOut = string | { reason: string; except: string };

export type GeometryParameter = Partial<Record<GeometryCheck, GeometryOptOut>>;

interface Finding {
  element: Element;
  message: string;
}

function messagesOf(findings: Finding[]): string[] {
  return findings.map((finding) => finding.message);
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const interactiveSelector = [
  'button',
  'a[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="menuitemcheckbox"]',
  '[role="option"]',
  '[role="slider"]',
].join(', ');

function frameOf(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-phone-frame]');
}

function boundsOf(root: HTMLElement): HTMLElement {
  return frameOf(root) ?? root.querySelector<HTMLElement>('[data-story-canvas]') ?? root;
}

function rounded(rect: Box): Box {
  return {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
  };
}

function boxOf(element: Element): Box {
  return rounded(element.getBoundingClientRect());
}

function isVisuallyHidden(style: CSSStyleDeclaration): boolean {
  return style.clip !== 'auto' || style.clipPath !== 'none';
}

function isShown(element: Element): boolean {
  if (!element.checkVisibility({ visibilityProperty: true, opacityProperty: true })) return false;
  if (isVisuallyHidden(getComputedStyle(element))) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function describe(element: Element, box: Box = boxOf(element)): string {
  const tag = element.tagName.toLowerCase();
  const label =
    element.getAttribute('aria-label') ??
    element.getAttribute('data-testid') ??
    element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 40) ??
    '';
  const size = [box.left, box.top, box.right - box.left, box.bottom - box.top];
  return `${tag} "${label}" [${size.join(', ')}]`;
}

function shownElements(container: Element): Element[] {
  return [container, ...container.querySelectorAll('*')].filter(isShown);
}

function hasOwnText(element: Element): boolean {
  return [...element.childNodes].some(
    (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
  );
}

function isTextControl(element: Element): boolean {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
}

function clips(overflow: string): boolean {
  return overflow !== 'visible';
}

function hides(overflow: string): boolean {
  return overflow === 'hidden' || overflow === 'clip';
}

function isScroller(overflow: string): boolean {
  return overflow === 'auto' || overflow === 'scroll';
}

function insideScroller(element: Element, frame: Element, axis: 'x' | 'y'): boolean {
  for (let node = element.parentElement; node && node !== frame; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (isScroller(axis === 'x' ? style.overflowX : style.overflowY)) return true;
  }
  return false;
}

function px(value: string): number {
  return Number.parseFloat(value) || 0;
}

function lineHeightOf(style: CSSStyleDeclaration): number {
  return style.lineHeight === 'normal' ? px(style.fontSize) : px(style.lineHeight);
}

function union(a: Box, b: Box): Box {
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  };
}

function intersection(a: Box, b: Box): Box {
  return {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  };
}

function hitAreaOf(element: Element): Box {
  const style = getComputedStyle(element);
  let box = boxOf(element);
  if (style.position === 'static' || clips(style.overflowX) || clips(style.overflowY)) return box;
  const rect = element.getBoundingClientRect();
  for (const pseudo of ['::before', '::after']) {
    const area = getComputedStyle(element, pseudo);
    if (area.content === 'none' || area.position !== 'absolute') continue;
    if (area.pointerEvents === 'none') continue;
    box = union(
      box,
      rounded({
        left: rect.left + px(style.borderLeftWidth) + px(area.left),
        top: rect.top + px(style.borderTopWidth) + px(area.top),
        right: rect.right - px(style.borderRightWidth) - px(area.right),
        bottom: rect.bottom - px(style.borderBottomWidth) - px(area.bottom),
      }),
    );
  }
  return box;
}

function clipped(element: Element, area: Box, root: Element): Box {
  let box = area;
  for (let node = element.parentElement; node && node !== root; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (isScroller(style.overflowX) || isScroller(style.overflowY)) break;
    if (hides(style.overflowX) || hides(style.overflowY)) {
      box = intersection(box, paddingBoxOf(node, style));
    }
  }
  return box;
}

function isHittable(element: Element): boolean {
  if (!element.checkVisibility({ visibilityProperty: true })) return false;
  if (isVisuallyHidden(getComputedStyle(element))) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function ownerOf(element: Element): Element {
  if (isTextControl(element) || element instanceof HTMLSelectElement) {
    const frame = element.closest('[data-field]');
    if (frame) return frame;
  }
  if (element instanceof HTMLInputElement) return element.closest('label') ?? element;
  return element;
}

function isOutOfFlow(style: CSSStyleDeclaration): boolean {
  return style.position === 'absolute' || style.position === 'fixed';
}

function paddingBoxOf(element: Element, style: CSSStyleDeclaration): Box {
  const rect = element.getBoundingClientRect();
  return rounded({
    left: rect.left + px(style.borderLeftWidth),
    top: rect.top + px(style.borderTopWidth),
    right: rect.right - px(style.borderRightWidth),
    bottom: rect.bottom - px(style.borderBottomWidth),
  });
}

function overflowFindings(root: HTMLElement): Finding[] {
  const bounds = boundsOf(root);
  const styles = new Map<Element, CSSStyleDeclaration>();
  const styleOf = (element: Element) => {
    const known = styles.get(element);
    if (known) return known;
    const style = getComputedStyle(element);
    styles.set(element, style);
    return style;
  };
  const overflowing = new Map<Element, number>();
  for (const element of shownElements(bounds)) {
    if (element === bounds) continue;
    let text = hasOwnText(element);
    const box = boxOf(element);
    for (let node: Element | null = element; node && node !== bounds;) {
      if (isOutOfFlow(styleOf(node))) text = false;
      node = node.parentElement;
      if (!node) break;
      const style = styleOf(node);
      if (isScroller(style.overflowX)) break;
      const clipping = clips(style.overflowX) || node === bounds;
      const sized = node.clientWidth > 0;
      if ((clipping || text) && sized && style.display !== 'inline' && !isTextControl(node)) {
        const edge = paddingBoxOf(node, style);
        const excess = Math.max(edge.left - box.left, box.right - edge.right);
        if (excess > 0) overflowing.set(node, Math.max(excess, overflowing.get(node) ?? 0));
      }
    }
  }
  return [...overflowing].map(([element, excess]) => ({
    element,
    message: `${describe(element)} overflows by ${excess}`,
  }));
}

export function horizontalOverflow(root: HTMLElement): string[] {
  return messagesOf(overflowFindings(root));
}

function tapTargetFindings(root: HTMLElement): Finding[] {
  const areas = new Map<Element, Box>();
  for (const element of root.querySelectorAll(interactiveSelector)) {
    const owner = ownerOf(element);
    if (!isHittable(element) || !isShown(owner)) continue;
    const labels = 'labels' in element ? [...((element.labels as NodeList | null) ?? [])] : [];
    const area = [owner, ...labels]
      .filter((node): node is Element => node instanceof Element && isShown(node))
      .map(hitAreaOf)
      .reduce(union, hitAreaOf(element));
    const known = areas.get(owner);
    areas.set(owner, known ? union(known, area) : area);
  }
  return [...areas].flatMap(([owner, area]) => {
    const box = clipped(owner, area, root);
    if (box.right <= box.left || box.bottom <= box.top) return [];
    const small =
      box.right - box.left < layout.tapTarget || box.bottom - box.top < layout.tapTarget;
    return small ? [{ element: owner, message: describe(owner, box) }] : [];
  });
}

export function smallTapTargets(root: HTMLElement): string[] {
  return messagesOf(tapTargetFindings(root));
}

function overlaysOf(root: HTMLElement): Element[] {
  return shownElements(root).filter(
    (element) =>
      element.hasAttribute('data-scrim') || getComputedStyle(element).position === 'fixed',
  );
}

function unframedOverlays(root: HTMLElement): Finding[] {
  return overlaysOf(root).map((overlay) => ({
    element: overlay,
    message: `${describe(overlay)} renders without [data-phone-frame]`,
  }));
}

function findingsOf(elements: Element[]): Finding[] {
  return elements.map((element) => ({ element, message: describe(element) }));
}

function frameFindings(root: HTMLElement): Finding[] {
  const frame = frameOf(root);
  if (!frame) return unframedOverlays(root);
  const edge = boxOf(frame);
  return findingsOf(
    shownElements(frame).filter((element) => {
      const box = boxOf(element);
      const outsideX = box.left < edge.left || box.right > edge.right;
      const outsideY = box.top < edge.top || box.bottom > edge.bottom;
      return (
        (outsideX && !insideScroller(element, frame, 'x')) ||
        (outsideY && !insideScroller(element, frame, 'y'))
      );
    }),
  );
}

export function outsideFrame(root: HTMLElement): string[] {
  return messagesOf(frameFindings(root));
}

function truncationFindings(root: HTMLElement): Finding[] {
  return findingsOf(
    shownElements(root).filter((element) => {
      if (!hasOwnText(element) || isTextControl(element)) return false;
      const style = getComputedStyle(element);
      if (isScroller(style.overflowX) || isScroller(style.overflowY)) return false;
      if (element.scrollWidth > element.clientWidth) return true;
      if (!clips(style.overflowY)) return false;
      const excess = element.scrollHeight - element.clientHeight;
      return style.webkitLineClamp === 'none' ? excess * 2 >= lineHeightOf(style) : excess > 0;
    }),
  );
}

export function truncatedText(root: HTMLElement): string[] {
  return messagesOf(truncationFindings(root));
}

function overlayFindings(root: HTMLElement): Finding[] {
  const frame = frameOf(root);
  if (!frame) return unframedOverlays(root);
  const edge = boxOf(frame);
  return findingsOf(
    [...root.querySelectorAll('[data-scrim]')].filter(isShown).filter((scrim) => {
      const box = boxOf(scrim);
      return (
        box.left !== edge.left ||
        box.top !== edge.top ||
        box.right !== edge.right ||
        box.bottom !== edge.bottom
      );
    }),
  );
}

export function overlaysOffFrame(root: HTMLElement): string[] {
  return messagesOf(overlayFindings(root));
}

export async function expectNoHorizontalOverflow(root: HTMLElement) {
  await expect(horizontalOverflow(root)).toEqual([]);
}

export async function expectTapTargets(root: HTMLElement) {
  await expect(smallTapTargets(root)).toEqual([]);
}

export async function expectInsideFrame(root: HTMLElement) {
  await expect(outsideFrame(root)).toEqual([]);
}

export async function expectNotTruncated(root: HTMLElement) {
  await expect(truncatedText(root)).toEqual([]);
}

export async function expectOverlayMatchesFrame(root: HTMLElement) {
  await expect(overlaysOffFrame(root)).toEqual([]);
}

const checks: Record<GeometryCheck, (root: HTMLElement) => Finding[]> = {
  overflow: overflowFindings,
  tapTargets: tapTargetFindings,
  frame: frameFindings,
  truncation: truncationFindings,
  overlays: overlayFindings,
};

const checkNames = Object.keys(checks) as GeometryCheck[];

function optOutsOf(value: unknown): GeometryParameter {
  return typeof value === 'object' && value !== null ? (value as GeometryParameter) : {};
}

function excusedSelectorOf(optOut: GeometryOptOut | undefined): string | null {
  return optOut === undefined || typeof optOut === 'string' ? null : optOut.except;
}

export async function expectGeometry(root: HTMLElement, parameter: unknown) {
  const optOuts = optOutsOf(parameter);
  for (const check of checkNames) {
    const optOut = optOuts[check];
    if (typeof optOut === 'string') continue;
    const excused = excusedSelectorOf(optOut);
    const findings = checks[check](root).filter(
      (finding) => excused === null || !finding.element.matches(excused),
    );
    await expect({ [check]: messagesOf(findings) }).toEqual({ [check]: [] });
  }
}
