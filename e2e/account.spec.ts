import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { signIn, signUp } from './helpers.ts';
import { t } from './t.ts';

function patchResponse(page: Page, path: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' && new URL(response.url()).pathname === path,
  );
}

const DE = { lng: 'de' } as const;

test('a new account under ru-RU gets language ru and a Russian combat list', async ({ page }) => {
  await signUp(page);
  const session = await page.request.get('/api/auth/get-session');
  expect(session.ok()).toBe(true);
  expect(await session.json()).toMatchObject({ user: { language: 'ru' } });
  await expect(page.getByRole('heading', { level: 1, name: t('CombatList:title') })).toBeVisible();
  await expect(page.getByText(t('EmptyState:noCombatsTitle'))).toBeVisible();
});

test('the language switches at once and stays after a reload', async ({ page }) => {
  await signUp(page);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1, name: t('Settings:title') })).toBeVisible();
  const languages = page.getByRole('radiogroup', { name: t('Settings:language') });
  await expect(languages.getByRole('radio', { name: 'Русский' })).toBeChecked();

  const saved = patchResponse(page, '/api/settings');
  await languages.getByRole('radio', { name: 'Deutsch' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: t('Settings:title', DE) }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('radiogroup', { name: t('Settings:language', DE) })
      .getByRole('radio', { name: 'Deutsch' }),
  ).toBeChecked();
  const response = await saved;
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ language: 'de' });

  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: t('Settings:title', DE) }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('radiogroup', { name: t('Settings:language', DE) })
      .getByRole('radio', { name: 'Deutsch' }),
  ).toBeChecked();

  await page.goto('/combats');
  await expect(
    page.getByRole('heading', { level: 1, name: t('CombatList:title', DE) }),
  ).toBeVisible();
  await expect(page.getByText(t('EmptyState:noCombatsTitle', DE))).toBeVisible();
});

test('the display name is renamed and kept after a reload', async ({ page }) => {
  await signUp(page, 'Dana');
  await page.goto('/account');
  const name = page.getByRole('textbox', { name: t('Account:displayName') });
  await expect(name).toHaveValue('Dana');

  const saved = patchResponse(page, '/api/account');
  await name.fill('Dana the Bold');
  await name.press('Enter');
  await name.blur();
  const response = await saved;
  expect(response.ok()).toBe(true);

  await page.reload();
  const session = await page.request.get('/api/auth/get-session');
  expect(session.ok()).toBe(true);
  expect(await session.json()).toMatchObject({ user: { name: 'Dana the Bold' } });
  await expect(page.getByRole('textbox', { name: t('Account:displayName') })).toHaveValue(
    'Dana the Bold',
  );
});

test('a deleted account lands on sign-in with the toast and its credentials stop working', async ({
  page,
}) => {
  const { email, password } = await signUp(page);
  await page.goto('/account');
  await page.getByRole('button', { name: t('Account:deleteAccount') }).click();
  const confirm = page.getByRole('alertdialog', { name: t('Dialog:deleteAccountTitle') });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: t('Dialog:cancel') }).click();
  await expect(confirm).toBeHidden();
  await expect(page).toHaveURL(/\/account$/);

  await page.getByRole('button', { name: t('Account:deleteAccount') }).click();
  await confirm.getByRole('button', { name: t('Dialog:delete') }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await expect(page.getByRole('status').getByText(t('Toast:accountDeleted'))).toBeVisible();

  await page.goto('/combats');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);

  await signIn(page, email, password);
  await expect(page.getByText(t('SignIn:wrongCredentials'))).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
});
