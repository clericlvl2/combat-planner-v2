import { describe, expect, it } from 'vite-plus/test';
import { sectionOf } from './sections.ts';

describe('sectionOf', () => {
  it.each([
    ['/combats', 'combats'],
    ['/combats/01JA0000000000000000000001', 'combats'],
    ['/library', 'library'],
    ['/settings', 'settings'],
    ['/account', 'account'],
    ['/about', 'about'],
  ])('maps %s to %s', (pathname, section) => {
    expect(sectionOf(pathname)).toBe(section);
  });
});
