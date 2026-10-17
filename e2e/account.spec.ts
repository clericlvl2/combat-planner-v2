import { expect, test } from '@playwright/test';
import { signIn, signUp } from './helpers.ts';

test('the language switches at once and stays after a reload', async ({ page }) => {
  await signUp(page);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  const languages = page.getByRole('radiogroup', { name: 'Language' });
  await expect(languages.getByRole('radio', { name: 'English' })).toBeChecked();

  await languages.getByRole('radio', { name: 'Deutsch' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();
  await expect(
    page.getByRole('radiogroup', { name: 'Sprache' }).getByRole('radio', { name: 'Deutsch' }),
  ).toBeChecked();

  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();
  await expect(
    page.getByRole('radiogroup', { name: 'Sprache' }).getByRole('radio', { name: 'Deutsch' }),
  ).toBeChecked();

  await page.goto('/combats');
  await expect(page.getByRole('heading', { level: 1, name: 'Kämpfe' })).toBeVisible();
  await expect(page.getByText('Noch keine Kämpfe')).toBeVisible();
});

test('the display name is renamed and kept after a reload', async ({ page }) => {
  await signUp(page, 'Dana');
  await page.goto('/account');
  const name = page.getByRole('textbox', { name: 'Display name' });
  await expect(name).toHaveValue('Dana');

  await name.fill('Dana the Bold');
  await name.press('Enter');
  await name.blur();
  await expect(name).toHaveValue('Dana the Bold');

  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Display name' })).toHaveValue('Dana the Bold');
});

test('a deleted account lands on sign-in with the toast and its credentials stop working', async ({
  page,
}) => {
  const { email, password } = await signUp(page);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Delete account' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Delete your account?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toBeHidden();
  await expect(page).toHaveURL(/\/account$/);

  await page.getByRole('button', { name: 'Delete account' }).click();
  await confirm.getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await expect(page.getByRole('status').getByText('Your account was deleted')).toBeVisible();

  await page.goto('/combats');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);

  await signIn(page, email, password);
  await expect(page.getByText('Wrong email or password')).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
});
