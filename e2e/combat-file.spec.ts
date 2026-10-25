import { expect, test } from '@playwright/test';
import {
  addUnit,
  createCombat,
  openCombatMenu,
  signUp,
  unitNames,
  unitRow,
  unitRows,
} from './helpers.ts';
import { containsT, escapeRegExp, t } from './t.ts';

test('a DM exports a combat to a file and imports it back as a new combat', async ({ page }) => {
  await signUp(page);
  const original = await createCombat(page, 'Goblin ambush');
  await addUnit(page, 'Aria', 'hero');
  await addUnit(page, 'Grak', 'enemy');

  await unitRow(page, 'Grak')
    .getByRole('button', { name: /^10 \/10/ })
    .click();
  const numpad = page.getByRole('dialog', { name: 'Grak' });
  await numpad
    .getByRole('group', { name: t('NumpadSheet:keypad') })
    .getByRole('button', { name: '3' })
    .click();
  await numpad.getByRole('button', { name: t('NumpadSheet:damage') }).click();
  await expect(numpad).toBeHidden();
  await expect(unitRow(page, 'Grak').getByRole('button', { name: '7 /10' })).toBeVisible();
  await page.getByRole('button', { name: containsT('TurnBar:startCombat') }).click();
  await expect(page.getByRole('button', { name: containsT('TurnBar:startCombat') })).toBeHidden();

  const downloading = page.waitForEvent('download');
  await openCombatMenu(page, t('CombatHeader:export'));
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('Goblin ambush.combat.json');
  const file = await download.path();

  await page.goto('/combats');
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: t('PageHeader:actions') }).click();
  await page.getByRole('menuitem', { name: t('CombatList:import') }).click();
  await (await choosing).setFiles(file);
  await expect(
    page.getByRole('status').getByText(t('Toast:imported', { title: 'Goblin ambush' })),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/combats$/);
  const cards = page.getByRole('button', { name: new RegExp(`^${escapeRegExp('Goblin ambush')}`) });
  await expect(cards).toHaveCount(2);

  await cards.first().click();
  await expect(page).toHaveURL(/\/combats\/[0-9A-Z]{26}$/);
  expect(new URL(page.url()).pathname).not.toBe(original);
  await expect(page.getByRole('heading', { level: 1, name: 'Goblin ambush' })).toBeVisible();
  await expect(unitRows(page)).toHaveCount(2);
  expect([...(await unitNames(page))].sort()).toEqual(['Aria', 'Grak']);
  await expect(page.getByRole('button', { name: containsT('TurnBar:startCombat') })).toBeVisible();
  await expect(unitRow(page, 'Aria').getByRole('button', { name: '10 /10' })).toBeVisible();
  await expect(unitRow(page, 'Grak').getByRole('button', { name: '10 /10' })).toBeVisible();
});
