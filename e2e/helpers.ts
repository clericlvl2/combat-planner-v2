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

export type UnitType = 'Hero' | 'Enemy' | 'Ally';

export async function createCombat(page: Page, title: string): Promise<string> {
  await page.goto('/combats');
  await page.getByRole('button', { name: 'New combat' }).click();
  const sheet = page.getByRole('dialog', { name: 'New combat' });
  await sheet.getByLabel('Title').fill(title);
  await sheet.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page).toHaveURL(/\/combats\/[0-9A-Z]{26}$/);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  return new URL(page.url()).pathname;
}

export function unitRows(page: Page) {
  return page.locator('div[data-unit-role]');
}

export function unitRow(page: Page, name: string) {
  return unitRows(page).filter({ has: page.getByText(name, { exact: true }) });
}

export async function openCombatMenu(page: Page, item: string): Promise<void> {
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page
    .getByRole('menu', { name: 'Combat menu' })
    .getByRole('menuitem', { name: item })
    .click();
}

export async function addUnit(page: Page, name: string, type: UnitType): Promise<void> {
  await openCombatMenu(page, 'Add unit');
  const form = page.getByRole('dialog', { name: 'Add unit' });
  await form.getByLabel('Name').fill(name);
  await form.getByRole('radiogroup', { name: 'Type' }).getByRole('radio', { name: type }).click();
  await form.getByRole('button', { name: 'Add unit' }).click();
  await expect(form).toBeHidden();
  await expect(unitRow(page, name)).toBeVisible();
}

export async function openUnitMenu(page: Page, name: string, item: string): Promise<void> {
  const row = unitRow(page, name);
  const details = row.getByRole('button', { name: 'Unit details' });
  if ((await details.getAttribute('aria-expanded')) !== 'true') await details.click();
  await row.getByRole('button', { name: 'More actions' }).click();
  await page
    .getByRole('menu', { name: `Actions for ${name}` })
    .getByRole('menuitem', { name: item })
    .click();
}

export async function unitNames(page: Page): Promise<string[]> {
  return unitRows(page).evaluateAll((rows) =>
    rows.map((row) => row.querySelector('div > span')?.textContent ?? ''),
  );
}

export async function initiatives(page: Page): Promise<number[]> {
  return unitRows(page)
    .getByRole('button', { name: 'Roll initiative' })
    .evaluateAll((buttons) =>
      buttons.map((button) => Number.parseInt(button.textContent ?? '', 10)),
    );
}
