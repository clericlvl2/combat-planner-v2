import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createPreset, presetNames, signUp } from './helpers.ts';
import { t } from './t.ts';

async function fillLibrary(page: Page): Promise<void> {
  await signUp(page);
  await page.goto('/library');
  await expect(page.getByText(t('Library:emptyTitle'))).toBeVisible();
  await createPreset(page, 'Zed Orc', 'enemy', ['orcs']);
  await createPreset(page, 'Orc Shaman', 'ally', ['orcs', 'casters']);
  await createPreset(page, 'Wolf', 'enemy', ['beasts']);
  await createPreset(page, 'Aria', 'hero', ['casters']);
  await expect(page.locator('article')).toHaveCount(4);
}

test('presets carry their tags, and the tag filter matches any tag and combines with search', async ({
  page,
}) => {
  await fillLibrary(page);
  await expect(page.locator('article').filter({ hasText: 'Orc Shaman' })).toContainText('orcs');
  await expect(page.locator('article').filter({ hasText: 'Orc Shaman' })).toContainText('casters');

  await page.getByRole('button', { name: t('Library:tags') }).click();
  const filter = page.getByRole('dialog', { name: t('TagSheet:filterTitle') });
  await filter.getByRole('checkbox', { name: /^orcs/ }).check();
  await expect(
    filter.getByRole('button', { name: t('TagSheet:showPresets', { count: 2 }) }),
  ).toBeVisible();
  await filter.getByRole('checkbox', { name: /^casters/ }).check();
  await expect(
    filter.getByRole('button', { name: t('TagSheet:showPresets', { count: 3 }) }),
  ).toBeVisible();
  await filter.getByRole('button', { name: t('TagSheet:showPresets', { count: 3 }) }).click();
  await expect(filter).toBeHidden();
  await expect(page.locator('article')).toHaveCount(3);
  expect((await presetNames(page)).sort()).toEqual(['Aria', 'Orc Shaman', 'Zed Orc']);
  await expect(
    page.getByRole('button', { name: t('PageHeader:removeFilter', { name: 'orcs' }) }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: t('PageHeader:removeFilter', { name: 'casters' }) }),
  ).toBeVisible();

  await page.getByRole('searchbox', { name: t('Library:search') }).fill('orc');
  await expect(page.locator('article')).toHaveCount(2);
  expect((await presetNames(page)).sort()).toEqual(['Orc Shaman', 'Zed Orc']);

  await page.getByRole('button', { name: t('PageHeader:removeFilter', { name: 'orcs' }) }).click();
  await expect(page.locator('article')).toHaveCount(1);
  expect(await presetNames(page)).toEqual(['Orc Shaman']);

  await page.getByRole('searchbox', { name: t('Library:search') }).fill('wolf');
  await expect(page.getByText(t('EmptyState:noResultsTitle'))).toBeVisible();
  await expect(page.getByText(t('Library:noResultsBody', { query: 'wolf' }))).toBeVisible();

  await page.getByRole('button', { name: t('PageHeader:clear'), exact: true }).click();
  await expect(page.locator('article')).toHaveCount(1);
  expect(await presetNames(page)).toEqual(['Wolf']);
});

test('the preset sort changes the order and survives a reload', async ({ page }) => {
  await fillLibrary(page);
  expect(await presetNames(page)).toEqual(['Aria', 'Wolf', 'Orc Shaman', 'Zed Orc']);

  await page.getByRole('button', { name: t('Library:sort'), exact: true }).click();
  const sort = page.getByRole('dialog', { name: t('SortSheet:sortPresets') });
  await expect(sort.getByRole('radio', { name: t('SortSheet:newestFirst') })).toBeChecked();
  await sort.getByRole('radio', { name: t('SortSheet:alphabetical') }).click();
  await expect(sort).toBeHidden();
  await expect.poll(() => presetNames(page)).toEqual(['Aria', 'Orc Shaman', 'Wolf', 'Zed Orc']);
  await expect(page.getByRole('button', { name: t('SortSheet:alphabetical') })).toBeVisible();

  await page.reload();
  await expect(page.locator('article')).toHaveCount(4);
  await expect.poll(() => presetNames(page)).toEqual(['Aria', 'Orc Shaman', 'Wolf', 'Zed Orc']);
  await expect(page.getByRole('button', { name: t('SortSheet:alphabetical') })).toBeVisible();

  await page.getByRole('button', { name: t('SortSheet:alphabetical') }).click();
  await expect(sort.getByRole('radio', { name: t('SortSheet:alphabetical') })).toBeChecked();
  await sort.getByRole('radio', { name: t('SortSheet:byType') }).click();
  await expect(sort).toBeHidden();
  await expect.poll(() => presetNames(page)).toEqual(['Wolf', 'Zed Orc', 'Orc Shaman', 'Aria']);

  await page.reload();
  await expect(page.locator('article')).toHaveCount(4);
  await expect.poll(() => presetNames(page)).toEqual(['Wolf', 'Zed Orc', 'Orc Shaman', 'Aria']);
  await expect(page.getByRole('button', { name: t('SortSheet:byType') })).toBeVisible();
});

test('a preset is duplicated with its tags and deleted with confirm', async ({ page }) => {
  await fillLibrary(page);

  await page.getByRole('button', { name: 'Wolf', exact: true }).click();
  await page
    .locator('article')
    .filter({ hasText: 'Wolf' })
    .getByRole('button', { name: t('CardActions:more') })
    .click();
  await page.getByRole('menuitem', { name: t('PresetCard:duplicate') }).click();
  await expect(
    page.getByRole('status').getByText(t('Toast:presetDuplicated', { name: 'Wolf 2' })),
  ).toBeVisible();
  const copy = page.locator('article').filter({
    has: page.getByRole('button', { name: 'Wolf 2', exact: true }),
  });
  await expect(copy).toBeVisible();
  await expect(copy).toContainText('beasts');
  await expect(page.locator('article')).toHaveCount(5);

  await page.getByRole('button', { name: 'Wolf 2', exact: true }).click();
  await copy.getByRole('button', { name: t('CardActions:more') }).click();
  await page.getByRole('menuitem', { name: t('PresetCard:delete') }).click();
  const confirm = page.getByRole('alertdialog', {
    name: t('Dialog:deletePresetTitle', { name: 'Wolf 2' }),
  });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: t('Dialog:cancel') }).click();
  await expect(confirm).toBeHidden();
  await expect(page.locator('article')).toHaveCount(5);

  await copy.getByRole('button', { name: t('CardActions:more') }).click();
  await page.getByRole('menuitem', { name: t('PresetCard:delete') }).click();
  await confirm.getByRole('button', { name: t('Dialog:delete') }).click();
  await expect(
    page.getByRole('status').getByText(t('Toast:deleted', { title: 'Wolf 2' })),
  ).toBeVisible();
  await expect(page.locator('article')).toHaveCount(4);
  await expect(page.getByRole('button', { name: 'Wolf 2', exact: true })).toHaveCount(0);

  await page.reload();
  await expect(page.locator('article')).toHaveCount(4);
  expect((await presetNames(page)).sort()).toEqual(['Aria', 'Orc Shaman', 'Wolf', 'Zed Orc']);
});
