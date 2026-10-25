import { expect, test } from '@playwright/test';
import {
  addUnit,
  createCombat,
  initiatives,
  openCombatMenu,
  openUnitMenu,
  signUp,
  unitNames,
  unitRow,
  unitRows,
} from './helpers.ts';
import { containsT, escapeRegExp, startsWithT, t } from './t.ts';

const editRoundAny = new RegExp(
  `^${escapeRegExp(
    t('CombatHeader:editRoundAndEscalation', { round: '\u0000', value: '\u0000' }),
  ).replaceAll('\u0000', '\\d+')}$`,
);

test('a DM builds a combat from new units, a duplicate and a Library preset', async ({ page }) => {
  await signUp(page);
  await createCombat(page, 'Goblin ambush');
  await expect(page.getByText(t('EmptyState:noUnitsTitle'))).toBeVisible();
  await expect(page.getByRole('button', { name: containsT('TurnBar:startCombat') })).toBeDisabled();

  await addUnit(page, 'Aria', 'hero');
  await addUnit(page, 'Grak', 'enemy');
  await addUnit(page, 'Bran', 'ally');
  await expect(unitRow(page, 'Aria')).toHaveAttribute('data-unit-role', 'hero');
  await expect(unitRow(page, 'Grak')).toHaveAttribute('data-unit-role', 'enemy');
  await expect(unitRow(page, 'Bran')).toHaveAttribute('data-unit-role', 'ally');
  expect(await unitNames(page)).toEqual(['Aria', 'Grak', 'Bran']);

  await openUnitMenu(page, 'Grak', t('UnitRow:duplicate'));
  await expect(unitRow(page, 'Grak 2')).toBeVisible();
  await expect(unitRow(page, 'Grak 2')).toHaveAttribute('data-unit-role', 'enemy');
  expect(await unitNames(page)).toEqual(['Aria', 'Grak', 'Grak 2', 'Bran']);

  await openUnitMenu(page, 'Bran', t('UnitRow:saveAsPreset'));
  await expect(
    page.getByRole('status').getByText(t('Toast:presetAdded', { name: 'Bran' })),
  ).toBeVisible();

  await openCombatMenu(page, t('CombatHeader:addUnit'));
  const form = page.getByRole('dialog', { name: t('UnitForm:addTitle') });
  await form.getByRole('radio', { name: t('UnitForm:library') }).click();
  await form
    .getByRole('group', { name: t('UnitForm:presets') })
    .getByRole('button', { name: /Bran/ })
    .click();
  await form
    .getByRole('button', { name: startsWithT('UnitForm:addPreset', { name: 'Bran' }) })
    .click();
  await expect(form).toBeHidden();
  await expect(unitRows(page)).toHaveCount(5);
  const names = await unitNames(page);
  expect(names.slice(0, 4)).toEqual(['Aria', 'Grak', 'Grak 2', 'Bran']);
  expect(names[4]).toMatch(/^Bran/);
  await expect(unitRows(page).nth(4)).toHaveAttribute('data-unit-role', 'ally');

  await page.reload();
  await expect(unitRows(page)).toHaveCount(5);

  await page.goto('/library');
  await expect(page.getByText('Bran', { exact: true })).toBeVisible();
});

test('Start shows the turn order and Next turn wraps into round 2 with escalation 1', async ({
  page,
}) => {
  await signUp(page);
  await createCombat(page, 'Bridge fight');
  await addUnit(page, 'Aria', 'hero');
  await addUnit(page, 'Grak', 'enemy');
  await addUnit(page, 'Bran', 'ally');
  await expect(page.getByRole('button', { name: editRoundAny })).toBeHidden();

  await page.getByRole('button', { name: containsT('TurnBar:startCombat') }).click();
  await expect(
    page.getByRole('button', {
      name: t('CombatHeader:editRoundAndEscalation', { round: 1, value: 0 }),
    }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: containsT('TurnBar:startCombat') })).toBeHidden();

  const order = await initiatives(page);
  expect(order).toHaveLength(3);
  for (const value of order) expect(value).toBeGreaterThanOrEqual(1);
  expect(order).toEqual([...order].sort((a, b) => b - a));
  await expect(unitRows(page).first()).toHaveAttribute('data-active', 'true');
  const names = await unitNames(page);
  expect([...names].sort()).toEqual(['Aria', 'Bran', 'Grak']);

  const nextTurn = page.getByRole('button', { name: startsWithT('TurnBar:nextTurn') });
  await expect(nextTurn).toContainText(names[1] ?? '');
  await nextTurn.click();
  await expect(unitRow(page, names[1] ?? '')).toHaveAttribute('data-active', 'true');
  await nextTurn.click();
  await expect(unitRow(page, names[2] ?? '')).toHaveAttribute('data-active', 'true');
  await expect(nextTurn).toContainText(t('CombatScreen:nextWrap', { name: names[0], round: 2 }));
  await expect(
    page.getByRole('button', {
      name: t('CombatHeader:editRoundAndEscalation', { round: 1, value: 0 }),
    }),
  ).toBeVisible();

  await nextTurn.click();
  await expect(
    page.getByRole('button', {
      name: t('CombatHeader:editRoundAndEscalation', { round: 2, value: 1 }),
    }),
  ).toBeVisible();
  await expect(unitRow(page, names[0] ?? '')).toHaveAttribute('data-active', 'true');

  await page.reload();
  await expect(
    page.getByRole('button', {
      name: t('CombatHeader:editRoundAndEscalation', { round: 2, value: 1 }),
    }),
  ).toBeVisible();
});

test('Undo reverts the last action and shows the Undid toast', async ({ page }) => {
  await signUp(page);
  await createCombat(page, 'Crypt');
  await addUnit(page, 'Aria', 'hero');
  await addUnit(page, 'Grak', 'enemy');
  await page.getByRole('button', { name: containsT('TurnBar:startCombat') }).click();
  await expect(
    page.getByRole('button', {
      name: t('CombatHeader:editRoundAndEscalation', { round: 1, value: 0 }),
    }),
  ).toBeVisible();
  await expect(unitRows(page).first()).toHaveAttribute('data-active', 'true');
  const names = await unitNames(page);
  const nextTurn = page.getByRole('button', { name: startsWithT('TurnBar:nextTurn') });
  await nextTurn.click();
  await nextTurn.click();
  await expect(
    page.getByRole('button', {
      name: t('CombatHeader:editRoundAndEscalation', { round: 2, value: 1 }),
    }),
  ).toBeVisible();

  await openCombatMenu(page, t('CombatHeader:undo'));
  await expect(page.getByRole('status').getByText(t('CombatScreen:undoNextTurn'))).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: t('CombatHeader:editRoundAndEscalation', { round: 1, value: 0 }),
    }),
  ).toBeVisible();
  await expect(unitRow(page, names[1] ?? '')).toHaveAttribute('data-active', 'true');

  await openUnitMenu(page, 'Grak', t('UnitRow:duplicate'));
  await expect(unitRow(page, 'Grak 2')).toBeVisible();
  await openCombatMenu(page, t('CombatHeader:undo'));
  await expect(
    page.getByRole('status').getByText(t('CombatScreen:undoDuplicateUnit', { name: 'Grak' })),
  ).toBeVisible();
  await expect(unitRow(page, 'Grak 2')).toHaveCount(0);

  await page.reload();
  await expect(unitRows(page)).toHaveCount(2);
  await expect(
    page.getByRole('button', {
      name: t('CombatHeader:editRoundAndEscalation', { round: 1, value: 0 }),
    }),
  ).toBeVisible();
});

test('a closed Sort sheet leaves nothing over the combat list', async ({ page }) => {
  await signUp(page);
  await createCombat(page, 'Old keep');
  await page.goto('/combats');
  await expect(page.getByText('Old keep')).toBeVisible();

  await page.getByRole('button', { name: t('CombatList:sort'), exact: true }).click();
  const sort = page.getByRole('dialog', { name: t('SortSheet:sortCombats') });
  await expect(sort).toBeVisible();
  await sort.getByRole('button', { name: t('SortSheet:done') }).click();
  await expect(sort).toBeHidden();

  await page.getByRole('button', { name: t('BottomBar:newCombat') }).click({ timeout: 3_000 });
  const sheet = page.getByRole('dialog', { name: t('CombatFormSheet:newCombat') });
  await expect(sheet).toBeVisible();
  await sheet.getByLabel(t('CombatFormSheet:title')).fill('After sort');
  await sheet.getByRole('button', { name: t('CombatFormSheet:create'), exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(/\/combats$/);
  await expect(page.getByText('After sort')).toBeVisible();
});

test('the header Back on a combat returns to the combat list', async ({ page }) => {
  await signUp(page);
  await createCombat(page, 'Return trip');
  await page.getByRole('button', { name: t('CombatHeader:back') }).click();
  await expect(page).toHaveURL(/\/combats$/);
});
