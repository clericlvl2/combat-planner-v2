import { expect } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';

export const PASSWORD = 'correct-horse-battery';

export interface Credentials {
  displayName: string;
  email: string;
  password: string;
}

let counter = 0;

export function uniqueEmail(prefix = 'dm'): string {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${counter}-${random}@example.com`;
}

export async function signUp(page: Page, displayName = 'Dana'): Promise<Credentials> {
  const credentials = { displayName, email: uniqueEmail(), password: PASSWORD };
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill(credentials.displayName);
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Password').fill(credentials.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/combats$/);
  return credentials;
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

export async function newPlayerContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ viewport: { width: 390, height: 844 } });
}
