import { expect, test } from '@playwright/test';
import { t } from './t.ts';

test('a guest on the landing taps Create account and reaches sign-up', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: t('Landing:title') })).toBeVisible();
  await page.getByRole('link', { name: t('Landing:signUp') }).click();
  await expect(page).toHaveURL(/\/auth\/sign-up$/);
  await expect(page.getByRole('heading', { level: 1, name: t('SignUp:title') })).toBeVisible();
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
