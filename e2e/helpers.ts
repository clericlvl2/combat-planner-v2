import { expect } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { startsWithT, t } from './t.ts';

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
  await page.getByLabel(t('SignUp:displayName')).fill(credentials.displayName);
  await page.getByLabel(t('SignUp:email')).fill(credentials.email);
  await page.getByLabel(t('SignUp:password')).fill(credentials.password);
  await page.getByRole('button', { name: t('SignUp:submit') }).click();
  await expect(page).toHaveURL(/\/combats$/);
  return credentials;
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/sign-in');
  await page.getByLabel(t('SignIn:email')).fill(email);
  await page.getByLabel(t('SignIn:password')).fill(password);
  await page.getByRole('button', { name: t('SignIn:submit'), exact: true }).click();
}

export async function newPlayerContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ viewport: { width: 320, height: 568 }, locale: 'ru-RU' });
}

export type UnitType = 'hero' | 'enemy' | 'ally';

export async function createCombat(page: Page, title: string): Promise<string> {
  await page.goto('/combats');
  await page.getByRole('button', { name: t('BottomBar:newCombat') }).click();
  const sheet = page.getByRole('dialog', { name: t('CombatFormSheet:newCombat') });
  await sheet.getByLabel(t('CombatFormSheet:title')).fill(title);
  await sheet.getByRole('button', { name: t('CombatFormSheet:create'), exact: true }).click();
  await expect(page).toHaveURL(/\/combats\/[0-9A-Z]{26}$/);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  return new URL(page.url()).pathname;
}

export function unitRows(page: Page) {
  return page.locator('div[data-unit-role]:has(> div)');
}

export function unitRow(page: Page, name: string) {
  return unitRows(page).filter({ has: page.getByText(name, { exact: true }) });
}

export async function openCombatMenu(page: Page, item: string): Promise<void> {
  await page.getByRole('button', { name: t('CombatHeader:menu'), exact: true }).click();
  await page
    .getByRole('menu', { name: t('CombatHeader:menuLabel') })
    .getByRole('menuitem', { name: item })
    .click();
}

export async function addUnit(page: Page, name: string, type: UnitType): Promise<void> {
  await openCombatMenu(page, t('CombatHeader:addUnit'));
  const form = page.getByRole('dialog', { name: t('UnitForm:addTitle') });
  await form.getByLabel(t('UnitForm:name')).fill(name);
  await form
    .getByRole('radiogroup', { name: t('UnitForm:type') })
    .getByRole('radio', { name: t(`UnitForm:${type}`) })
    .click();
  await form.getByRole('button', { name: t('UnitForm:addUnit') }).click();
  await expect(form).toBeHidden();
  await expect(unitRow(page, name)).toBeVisible();
}

export async function openUnitMenu(page: Page, name: string, item: string): Promise<void> {
  const row = unitRow(page, name);
  const details = row.getByRole('button', { name, exact: true });
  if ((await details.getAttribute('aria-expanded')) !== 'true') await details.click();
  await row.getByRole('button', { name: t('CardActions:more') }).click();
  await page
    .getByRole('menu', { name: t('UnitRow:menuLabel', { name }) })
    .getByRole('menuitem', { name: item })
    .click();
}

export async function unitNames(page: Page): Promise<string[]> {
  return unitRows(page).evaluateAll((rows) =>
    rows.map((row) => row.querySelector('[data-part="name"]')?.textContent ?? ''),
  );
}

export async function initiatives(page: Page): Promise<number[]> {
  return unitRows(page)
    .getByRole('button', { name: t('UnitRow:rollInitiative') })
    .evaluateAll((buttons) =>
      buttons.map((button) => Number.parseInt(button.textContent ?? '', 10)),
    );
}

export async function rowInitiatives(page: Page): Promise<number[]> {
  return unitRows(page).evaluateAll((rows) =>
    rows.map((row) =>
      Number.parseInt(
        (row.querySelector(':scope > [data-unit-role]')?.textContent ?? '').replace('\u2212', '-'),
        10,
      ),
    ),
  );
}

export async function rowOrder(page: Page, names: readonly string[]): Promise<string[]> {
  const texts = await unitRows(page).allTextContents();
  return texts.map(
    (text) =>
      names.filter((name) => text.includes(name)).sort((a, b) => b.length - a.length)[0] ?? '',
  );
}

export async function shareLink(page: Page): Promise<string> {
  await openCombatMenu(page, t('CombatHeader:share'));
  const sheet = page.getByRole('dialog', { name: t('ShareSheet:title') });
  const url = sheet.locator('[data-url]');
  await expect(url).toHaveText(/\/play\?t=/);
  return (await url.textContent()) ?? '';
}

export async function joinAsPlayer(player: Page, link: string, name: string, hero: string) {
  await player.goto(link);
  await expect(player.getByRole('heading', { name: t('Heroes:title') })).toBeVisible();
  await player.getByLabel(t('Heroes:nameLabel')).fill(name);
  await player.getByRole('checkbox', { name: hero }).check();
  await player.getByRole('button', { name: t('Heroes:join') }).click();
  await expect(unitRows(player).filter({ hasText: hero })).toHaveAttribute('data-mine', 'true');
}

export async function createPreset(
  page: Page,
  name: string,
  type: UnitType,
  tags: readonly string[],
): Promise<void> {
  await page.getByRole('button', { name: t('BottomBar:newPreset') }).click();
  const form = page.getByRole('dialog', { name: t('PresetFormSheet:newPreset') });
  await form.getByLabel(t('PresetFormSheet:name')).fill(name);
  await form
    .getByRole('radiogroup', { name: t('PresetFormSheet:type') })
    .getByRole('radio', { name: t(`PresetFormSheet:${type}`) })
    .click();
  if (tags.length > 0) {
    await form.getByRole('button', { name: t('PresetFormSheet:addTag') }).click();
    const sheet = page.getByRole('dialog', { name: t('TagSheet:assignTitle', { name }) });
    for (const tag of tags) {
      await sheet.getByRole('searchbox', { name: t('TagSheet:searchOrCreate') }).fill(tag);
      const create = sheet.getByRole('button', { name: t('CheckList:create', { query: tag }) });
      const existing = sheet.getByRole('checkbox', { name: new RegExp(`^${tag}\\b`) });
      await expect(create.or(existing)).toBeVisible();
      if (await create.isVisible()) await create.click();
      else await existing.check();
      await expect(existing).toBeChecked();
    }
    await sheet.getByRole('button', { name: startsWithT('TagSheet:done') }).click();
    await expect(sheet).toBeHidden();
  }
  await form.getByRole('button', { name: t('PresetFormSheet:create'), exact: true }).click();
  await expect(form).toBeHidden();
}

export async function presetNames(page: Page): Promise<string[]> {
  return page
    .locator('article')
    .evaluateAll((cards) =>
      cards.map((card) => card.querySelector('[data-part="name"]')?.textContent ?? ''),
    );
}
