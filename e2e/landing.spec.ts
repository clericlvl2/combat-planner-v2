import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { signUp } from './helpers.ts';
import { t } from './t.ts';

interface RootWatch {
  withoutLanding: number;
  withLanding: number;
}

const watchRoot = (page: Page) =>
  page.addInitScript(() => {
    const watch: RootWatch = { withoutLanding: 0, withLanding: 0 };
    Object.assign(window, { rootWatch: watch });
    new MutationObserver(() => {
      const root = document.getElementById('root');
      if (!root || root.childElementCount === 0) return;
      if (root.querySelector('[data-landing]')) watch.withLanding += 1;
      else watch.withoutLanding += 1;
    }).observe(document, { childList: true, subtree: true });
  });

const rootWatch = (page: Page): Promise<RootWatch> =>
  page.evaluate(() => (window as unknown as { rootWatch: RootWatch }).rootWatch);

test('a guest at / sees the landing as the first content of the column', async ({ page }) => {
  await watchRoot(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: t('Landing:title') })).toBeVisible();
  const watch = await rootWatch(page);
  expect(watch.withLanding).toBeGreaterThan(0);
  expect(watch.withoutLanding).toBe(0);
});

test('a guest on the landing taps Create account and reaches sign-up', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: t('Landing:title') })).toBeVisible();
  await page.getByRole('link', { name: t('Landing:signUp') }).click();
  await expect(page).toHaveURL(/\/auth\/sign-up$/);
  await expect(page.getByRole('heading', { level: 1, name: t('SignUp:title') })).toBeVisible();
});

test('a signed-in DM on / reaches the combat list and lands on / after signing out', async ({
  page,
}) => {
  await signUp(page);
  await watchRoot(page);
  const response = await page.goto('/');
  expect(new URL(response?.request().redirectedFrom()?.url() ?? '').pathname).toBe('/');
  await expect(page).toHaveURL(/\/combats$/);
  await expect(page.getByRole('heading', { level: 1, name: t('CombatList:title') })).toBeVisible();
  expect((await rootWatch(page)).withLanding).toBe(0);

  await page.goto('/account');
  await page.getByRole('button', { name: t('Account:signOut'), exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: t('Landing:title') })).toBeVisible();
});

test('a guest opens About from the landing and goes back', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: t('Landing:about') }).click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { level: 1, name: t('About:title') })).toBeVisible();
  await page.getByRole('button', { name: t('PageHeader:back') }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: t('Landing:title') })).toBeVisible();
});

test('/about opens without a session', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1, name: t('About:title') })).toBeVisible();
  await expect(page.getByText(t('About:legal'))).toBeVisible();
});

test.describe('on a desktop window', () => {
  test.use({ viewport: { width: 1280, height: 844 } });

  test('the landing language sheet dims the whole window and stays a centred column', async ({
    page,
  }) => {
    await page.goto('/');
    const signUpLink = page.getByRole('link', { name: t('Landing:signUp') });
    await expect(signUpLink).toBeVisible();
    const target = await signUpLink.boundingBox();
    if (!target) throw new Error('the sign-up link has no box');
    await page
      .getByRole('button', { name: t('LanguageSheet:current', { name: 'Русский' }) })
      .click();
    const sheet = page.getByRole('dialog', { name: t('LanguageSheet:title') });
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    if (!box) throw new Error('the language sheet has no box');
    expect(box.width).toBeLessThanOrEqual(440);
    expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(1);
    const scrim = await page.locator('[data-scrim]').boundingBox();
    expect(scrim).toEqual({ x: 0, y: 0, width: 1280, height: 844 });
    await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2);
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/$/);
  });
});
