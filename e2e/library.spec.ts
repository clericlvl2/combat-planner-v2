import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createPreset, presetNames, signUp } from './helpers.ts';

async function fillLibrary(page: Page): Promise<void> {
  await signUp(page);
  await page.goto('/library');
  await expect(page.getByText('No presets yet')).toBeVisible();
  await createPreset(page, 'Zed Orc', 'Enemy', ['orcs']);
  await createPreset(page, 'Orc Shaman', 'Ally', ['orcs', 'casters']);
  await createPreset(page, 'Wolf', 'Enemy', ['beasts']);
  await createPreset(page, 'Aria', 'Hero', ['casters']);
  await expect(page.locator('article')).toHaveCount(4);
}

test('presets carry their tags, and the tag filter matches any tag and combines with search', async ({
  page,
}) => {
  await fillLibrary(page);
  await expect(page.locator('article').filter({ hasText: 'Orc Shaman' })).toContainText('orcs');
  await expect(page.locator('article').filter({ hasText: 'Orc Shaman' })).toContainText('casters');

  await page.getByRole('button', { name: 'Tags' }).click();
  const filter = page.getByRole('dialog', { name: 'Filter by tag' });
  await filter.getByRole('checkbox', { name: /^orcs/ }).check();
  await expect(filter.getByRole('button', { name: 'Show 2 presets' })).toBeVisible();
  await filter.getByRole('checkbox', { name: /^casters/ }).check();
  await expect(filter.getByRole('button', { name: 'Show 3 presets' })).toBeVisible();
  await filter.getByRole('button', { name: 'Show 3 presets' }).click();
  await expect(filter).toBeHidden();
  await expect(page.locator('article')).toHaveCount(3);
  expect((await presetNames(page)).sort()).toEqual(['Aria', 'Orc Shaman', 'Zed Orc']);
  await expect(page.getByRole('button', { name: 'Remove filter orcs' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove filter casters' })).toBeVisible();

  await page.getByRole('searchbox', { name: 'Search presets' }).fill('orc');
  await expect(page.locator('article')).toHaveCount(2);
  expect((await presetNames(page)).sort()).toEqual(['Orc Shaman', 'Zed Orc']);

  await page.getByRole('button', { name: 'Remove filter orcs' }).click();
  await expect(page.locator('article')).toHaveCount(1);
  expect(await presetNames(page)).toEqual(['Orc Shaman']);

  await page.getByRole('searchbox', { name: 'Search presets' }).fill('wolf');
  await expect(page.getByText('Nothing found')).toBeVisible();
  await expect(page.getByText('No preset matches “wolf”.')).toBeVisible();

  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.locator('article')).toHaveCount(1);
  expect(await presetNames(page)).toEqual(['Wolf']);
});

test('the preset sort changes the order and survives a reload', async ({ page }) => {
  await fillLibrary(page);
  expect(await presetNames(page)).toEqual(['Aria', 'Wolf', 'Orc Shaman', 'Zed Orc']);

  await page.getByRole('button', { name: 'Sort', exact: true }).click();
  const sort = page.getByRole('dialog', { name: 'Sort presets' });
  await expect(sort.getByRole('radio', { name: 'Newest first' })).toBeChecked();
  await sort.getByRole('radio', { name: 'A–Z' }).click();
  await expect(sort).toBeHidden();
  await expect.poll(() => presetNames(page)).toEqual(['Aria', 'Orc Shaman', 'Wolf', 'Zed Orc']);
  await expect(page.getByRole('button', { name: 'A–Z' })).toBeVisible();

  await page.reload();
  await expect(page.locator('article')).toHaveCount(4);
  await expect.poll(() => presetNames(page)).toEqual(['Aria', 'Orc Shaman', 'Wolf', 'Zed Orc']);
  await expect(page.getByRole('button', { name: 'A–Z' })).toBeVisible();

  await page.getByRole('button', { name: 'A–Z' }).click();
  await expect(sort.getByRole('radio', { name: 'A–Z' })).toBeChecked();
  await sort.getByRole('radio', { name: 'By type' }).click();
  await expect(sort).toBeHidden();
  await expect.poll(() => presetNames(page)).toEqual(['Wolf', 'Zed Orc', 'Orc Shaman', 'Aria']);

  await page.reload();
  await expect(page.locator('article')).toHaveCount(4);
  await expect.poll(() => presetNames(page)).toEqual(['Wolf', 'Zed Orc', 'Orc Shaman', 'Aria']);
  await expect(page.getByRole('button', { name: 'By type' })).toBeVisible();
});

test('a preset is duplicated with its tags and deleted with confirm', async ({ page }) => {
  await fillLibrary(page);

  await page.getByRole('button', { name: 'Actions: Wolf' }).click();
  await page
    .locator('article')
    .filter({ hasText: 'Wolf' })
    .getByRole('button', { name: 'More actions' })
    .click();
  await page.getByRole('menuitem', { name: 'Duplicate' }).click();
  await expect(page.getByRole('status').getByText('Wolf 2 created')).toBeVisible();
  const copy = page
    .locator('article')
    .filter({ has: page.getByRole('button', { name: 'Actions: Wolf 2' }) });
  await expect(copy).toBeVisible();
  await expect(copy).toContainText('beasts');
  await expect(page.locator('article')).toHaveCount(5);

  await page.getByRole('button', { name: 'Actions: Wolf 2' }).click();
  await copy.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Delete Wolf 2?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirm).toBeHidden();
  await expect(page.locator('article')).toHaveCount(5);

  await copy.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await confirm.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('status').getByText('Wolf 2 deleted')).toBeVisible();
  await expect(page.locator('article')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Actions: Wolf 2' })).toHaveCount(0);

  await page.reload();
  await expect(page.locator('article')).toHaveCount(4);
  expect((await presetNames(page)).sort()).toEqual(['Aria', 'Orc Shaman', 'Wolf', 'Zed Orc']);
});
