import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import {
  addUnit,
  createCombat,
  joinAsPlayer,
  newPlayerContext,
  rowOrder,
  shareLink,
  signUp,
  unitRow,
  unitRows,
} from './helpers.ts';

const NAMES = ['Aria', 'Grak', 'Bran'] as const;

let playerContext: BrowserContext;
let player: Page;

test.beforeEach(async ({ browser }) => {
  playerContext = await newPlayerContext(browser);
  player = await playerContext.newPage();
});

test.afterEach(async () => {
  await playerContext.close();
});

async function prepareCombat(page: Page, title: string): Promise<string> {
  await signUp(page);
  await createCombat(page, title);
  await addUnit(page, 'Aria', 'Hero');
  await addUnit(page, 'Grak', 'Enemy');
  await addUnit(page, 'Bran', 'Ally');
  return shareLink(page);
}

test('a player claims a hero and sees the turn order after Start', async ({ page }) => {
  const link = await prepareCombat(page, 'Goblin ambush');
  await joinAsPlayer(player, link, 'Pat', 'Aria');
  await expect(player.getByRole('heading', { level: 1, name: 'Setup' })).toBeVisible();
  await expect(player.getByText('Waiting for the DM to start the combat')).toBeVisible();

  await page
    .getByRole('dialog', { name: 'Share with players' })
    .getByRole('button', { name: 'Close' })
    .click();
  await expect(unitRow(page, 'Aria').getByText('Pat', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Start combat/ }).click();
  await expect(page.getByRole('button', { name: 'Edit round, round 1' })).toBeVisible();

  await expect(player.getByRole('heading', { level: 1, name: 'Round 1' })).toBeVisible();
  await expect(player.getByText('Waiting for the DM to start the combat')).toBeHidden();
  await expect(unitRows(player)).toHaveCount(3);
  const dmOrder = await rowOrder(page, NAMES);
  expect(await rowOrder(player, NAMES)).toEqual(dmOrder);
  await expect(unitRows(player).first()).toHaveAttribute('data-active', 'true');
  await expect(unitRows(player).filter({ hasText: 'Aria' })).toContainText('You');

  await page.getByRole('button', { name: /^Next turn/ }).click();
  await expect(unitRows(player).nth(1)).toHaveAttribute('data-active', 'true');
  expect(await rowOrder(player, NAMES)).toEqual(dmOrder);
});

test('a player damages their own hero and the DM sees it without a reload', async ({ page }) => {
  const link = await prepareCombat(page, 'Bridge fight');
  await joinAsPlayer(player, link, 'Pat', 'Aria');
  await page
    .getByRole('dialog', { name: 'Share with players' })
    .getByRole('button', { name: 'Close' })
    .click();
  await page.getByRole('button', { name: /Start combat/ }).click();
  await expect(player.getByRole('heading', { level: 1, name: 'Round 1' })).toBeVisible();
  const dmUrl = page.url();
  await expect(unitRow(page, 'Aria').getByRole('button', { name: '10 /10' })).toBeVisible();

  const ownRow = unitRows(player).filter({ hasText: 'Aria' });
  await ownRow.getByRole('button', { name: /^10 \/10/ }).click();
  const numpad = player.getByRole('dialog', { name: 'Aria' });
  await expect(numpad.getByRole('button', { name: 'Set Max' })).toHaveCount(0);
  await numpad.getByRole('group', { name: 'Keypad' }).getByRole('button', { name: '3' }).click();
  await numpad.getByRole('button', { name: 'Damage' }).click();
  await expect(numpad).toBeHidden();
  await expect(ownRow.getByRole('button', { name: /^7 \/10/ })).toBeVisible();

  await expect(unitRow(page, 'Aria').getByRole('button', { name: '7 /10' })).toBeVisible();
  expect(page.url()).toBe(dmUrl);
});

test('a reissued link expires the old one and releases the claim', async ({ page }) => {
  const link = await prepareCombat(page, 'Crypt');
  await joinAsPlayer(player, link, 'Pat', 'Aria');
  const sheet = page.getByRole('dialog', { name: 'Share with players' });

  await sheet.getByRole('button', { name: 'Revoke and reissue link' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Revoke the link?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Revoke' }).click();
  await expect(confirm).toBeHidden();
  await expect(sheet.locator('[data-url]')).not.toHaveText(link);
  const newLink = (await sheet.locator('[data-url]').textContent()) ?? '';
  expect(newLink).toMatch(/\/play\?t=/);

  await expect(player.getByRole('heading', { name: 'This link no longer works' })).toBeVisible();
  await player.goto(link);
  await expect(player.getByRole('heading', { name: 'This link no longer works' })).toBeVisible();

  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(unitRow(page, 'Aria').getByText('Pat', { exact: true })).toHaveCount(0);

  await player.goto(newLink);
  await expect(player.getByRole('heading', { name: 'Who are you playing?' })).toBeVisible();
  await expect(player.getByRole('checkbox', { name: 'Aria' })).not.toBeChecked();
  await expect(player.getByRole('checkbox', { name: 'Aria' })).toBeEnabled();
});

test('a player sees Combat deleted when the DM deletes the combat', async ({ page }) => {
  const link = await prepareCombat(page, 'Old keep');
  await joinAsPlayer(player, link, 'Pat', 'Aria');

  await page.goto('/combats');
  await page.getByRole('button', { name: 'Details for Old keep' }).click();
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Delete Old keep?' });
  await confirm.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('status').getByText('Old keep deleted')).toBeVisible();
  await expect(page.getByText('No combats yet')).toBeVisible();

  await expect(player.getByRole('heading', { name: 'Old keep was deleted' })).toBeVisible();
  await expect(player.getByText('The DM deleted it. Ask them for a new link.')).toBeVisible();
});
