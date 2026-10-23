import { expect, test } from '@playwright/test';
import { signUp } from './helpers.ts';
import { t } from './t.ts';

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
  await page.goto('/');
  await expect(page).toHaveURL(/\/combats$/);

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
