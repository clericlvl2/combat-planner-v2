import { expect, test } from '@playwright/test';
import { t } from './t.ts';

test('a guest on the landing taps Create account and reaches sign-up', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: t('Landing:title') })).toBeVisible();
  await page.getByRole('link', { name: t('Landing:signUp') }).click();
  await expect(page).toHaveURL(/\/auth\/sign-up$/);
  await expect(page.getByRole('heading', { level: 1, name: t('SignUp:title') })).toBeVisible();
});
