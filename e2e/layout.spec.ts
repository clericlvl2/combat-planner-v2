import { expect, test } from '@playwright/test';
import { signUp } from './helpers.ts';
import { t } from './t.ts';

const VIEWPORT = { width: 440, height: 956 };

const screens = [
  { path: '/combats', heading: t('CombatList:title') },
  { path: '/library', heading: t('Library:title') },
  { path: '/settings', heading: t('Settings:title') },
] as const;

test.use({ viewport: VIEWPORT });

test('every screen fills a tall viewport without a page scroll', async ({ page }) => {
  await signUp(page);
  for (const screen of screens) {
    await page.goto(screen.path);
    const heading = page.getByRole('heading', { level: 1, name: screen.heading });
    await expect(heading).toBeVisible();
    const layout = await heading.evaluate((element) => {
      const root = document.getElementById('root');
      let screenRoot: Element = element;
      while (screenRoot.parentElement && screenRoot.parentElement !== root) {
        screenRoot = screenRoot.parentElement;
      }
      const scroller = document.scrollingElement ?? document.documentElement;
      return {
        bottom: screenRoot.getBoundingClientRect().bottom,
        scrollHeight: scroller.scrollHeight,
        clientHeight: scroller.clientHeight,
      };
    });
    expect(layout.bottom, screen.path).toBeGreaterThanOrEqual(VIEWPORT.height - 1);
    expect(layout.bottom, screen.path).toBeLessThanOrEqual(VIEWPORT.height + 1);
    expect(layout.scrollHeight, screen.path).toBeLessThanOrEqual(layout.clientHeight);
  }
});
