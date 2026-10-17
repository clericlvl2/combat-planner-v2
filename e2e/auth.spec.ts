import { expect, test } from '@playwright/test';
import { signIn, signUp } from './helpers.ts';

test('sign-up lands on an empty combat list', async ({ page }) => {
  await signUp(page);
  await expect(page.getByText('No combats yet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New combat' })).toBeEnabled();
});

test('sign-out, then sign-in with the same credentials — defect: sign-out POST answers 415', async ({
  page,
}) => {
  test.fail();
  const { email, password } = await signUp(page);

  await page.goto('/account');
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await page.goto('/combats');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);

  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/combats$/);
  await expect(page.getByText('No combats yet')).toBeVisible();
});

test('sign-in with the sign-up credentials in a fresh session', async ({ page, context }) => {
  const { email, password } = await signUp(page);
  await context.clearCookies();
  await page.goto('/combats');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);

  await signIn(page, email, password);
  await expect(page).toHaveURL(/\/combats$/);
  await expect(page.getByText('No combats yet')).toBeVisible();
  await page.goto('/account');
  await expect(page.getByText(email)).toBeVisible();
});

test('a wrong password shows the error and keeps the guest on sign-in', async ({
  page,
  context,
}) => {
  const { email } = await signUp(page);
  await context.clearCookies();

  await signIn(page, email, 'wrong-password-123');
  await expect(page.getByText('Wrong email or password')).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await page.goto('/combats');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
});

test('a guest on /combats is redirected to sign-in', async ({ page }) => {
  await page.goto('/combats');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('a signed-in user on /auth/sign-in is redirected to /combats', async ({ page }) => {
  await signUp(page);
  await page.goto('/auth/sign-in');
  await expect(page).toHaveURL(/\/combats$/);
  await expect(page.getByText('No combats yet')).toBeVisible();
});
