import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createCombat, openCombatMenu, signIn, signUp } from './helpers.ts';
import { t } from './t.ts';

const signOut = async (page: Page, email: string) => {
  await page.goto('/account');
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole('button', { name: t('Account:signOut') }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
};

test('sign-up lands on an empty combat list', async ({ page }) => {
  await signUp(page);
  await expect(page.getByText(t('EmptyState:noCombatsTitle'))).toBeVisible();
  await expect(page.getByRole('button', { name: t('BottomBar:newCombat') })).toBeEnabled();
});

test('sign-out, then sign-in with the same credentials', async ({ page }) => {
  const { email, password } = await signUp(page);

  await signOut(page, email);
  await page.goto('/combats');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);

  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/combats$/);
  await expect(page.getByText(t('EmptyState:noCombatsTitle'))).toBeVisible();
});

test('sign-in with the sign-up credentials in a fresh session', async ({ page, context }) => {
  const { email, password } = await signUp(page);
  await context.clearCookies();
  await page.goto('/combats');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);

  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/combats$/);
  await expect(page.getByText(t('EmptyState:noCombatsTitle'))).toBeVisible();
  await page.goto('/account');
  await expect(page.getByText(email)).toBeVisible();
});

test('a wrong password shows the error and keeps the guest on sign-in', async ({ page }) => {
  const { email } = await signUp(page);
  await signOut(page, email);

  await signIn(page, email, 'wrong-password-123');
  await expect(page.getByText(t('SignIn:wrongCredentials'))).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await page.goto('/combats');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
});

test('a guest on /combats is redirected to sign-in', async ({ page }) => {
  await page.goto('/combats');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await expect(page.getByRole('heading', { name: t('SignIn:title') })).toBeVisible();
});

test('a signed-in user on /auth/sign-in is redirected to /combats', async ({ page }) => {
  await signUp(page);
  await page.goto('/auth/sign-in');
  await expect(page).toHaveURL(/\/combats$/);
  await expect(page.getByText(t('EmptyState:noCombatsTitle'))).toBeVisible();
});

test('a guest on /library is redirected to sign-in', async ({ page }) => {
  await page.goto('/library');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await expect(page.getByRole('heading', { name: t('SignIn:title') })).toBeVisible();
});

test('a combat reloaded after the session is cleared goes to sign-in', async ({
  page,
  context,
}) => {
  await signUp(page);
  await createCombat(page, 'Lost session');
  await context.clearCookies();
  await page.reload();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await expect(page.getByRole('heading', { name: t('SignIn:title') })).toBeVisible();
});

test('an action on a combat after the session is cleared goes to sign-in', async ({
  page,
  context,
}) => {
  await signUp(page);
  await createCombat(page, 'Lost session');
  await context.clearCookies();
  await openCombatMenu(page, t('CombatHeader:addUnit'));
  const form = page.getByRole('dialog', { name: t('UnitForm:addTitle') });
  await form.getByLabel(t('UnitForm:name')).fill('Orc');
  await form.getByRole('button', { name: t('UnitForm:addUnit') }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await expect(page.getByRole('heading', { name: t('SignIn:title') })).toBeVisible();
});
