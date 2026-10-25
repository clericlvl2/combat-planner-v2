import { expect, test } from '@playwright/test';
import { signUp, tourStep } from './helpers.ts';
import { containsT, t } from './t.ts';
import { emptyStorage } from './tourStorage.ts';

test.use({ storageState: emptyStorage });

test('a new DM walks the tour from the first combat to sharing it', async ({ page }) => {
  const step = (key: string, current: number | null) => tourStep(page, 'dm', key, current);
  const tooltips = page.locator('[data-tour-tooltip]');

  await signUp(page);
  await step('create', 1);
  await page.getByRole('button', { name: t('BottomBar:newCombat') }).click();

  await step('title', 1);
  const form = page.getByRole('dialog', { name: t('CombatFormSheet:newCombat') });
  await form.getByLabel(t('CombatFormSheet:title')).fill('Засада гоблинов');
  const confirm = await step('confirm', 1);
  await confirm.getByRole('button', { name: t('Tour:next') }).click();
  await expect(form).toBeHidden();

  await step('open', 2);
  await page.getByRole('button', { name: /^Засада гоблинов/ }).click();
  await expect(page).toHaveURL(/\/combats\/[0-9A-Z]{26}$/);

  const addUnit = await step('addUnit', 3);
  await addUnit.getByRole('button', { name: t('Tour:next') }).click();
  await step('unitName', 3);
  const unitForm = page.getByRole('dialog', { name: t('UnitForm:addTitle') });
  await unitForm.getByLabel(t('UnitForm:name')).fill('Гоблин');
  await step('unitSave', 3);
  await unitForm.getByRole('button', { name: t('UnitForm:addUnit') }).click();
  await expect(unitForm).toBeHidden();

  await step('initiative', 4);
  await page.getByRole('button', { name: t('UnitRow:rollInitiative') }).click();
  const roll = await step('roll', 4);
  await roll.getByRole('button', { name: t('Tour:next') }).click();

  await step('start', 5);
  await page.getByRole('button', { name: containsT('TurnBar:startCombat') }).click();

  await step('hp', 6);
  await page.locator("[data-tour='hp']").first().click();
  const apply = await step('hpApply', 6);
  await expect(apply).toContainText(t('Tour:hpApplyBody'));
  const numpad = page.getByRole('dialog', { name: 'Гоблин' });
  const hp = await page.locator("[data-tour='hp']").first().textContent();
  await apply.getByRole('button', { name: t('Tour:gotIt') }).click();
  await expect(numpad).toBeHidden();
  await expect(page.locator("[data-tour='hp']").first()).toHaveText(hp ?? '');

  await step('nextTurn', 7);
  await page.getByRole('button', { name: containsT('TurnBar:nextTurn') }).click();

  await step('menu', 8);
  await page.getByRole('button', { name: t('CombatHeader:menu'), exact: true }).click();
  const share = await step('share', 8);
  await share.getByRole('button', { name: t('Tour:next') }).click();
  const link = await step('link', 8);
  await expect(page.getByRole('dialog', { name: t('ShareSheet:title') })).toBeVisible();
  await link.getByRole('button', { name: t('Tour:done') }).click();

  await expect(tooltips).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Засада гоблинов' })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(tooltips).toHaveCount(0);
});
