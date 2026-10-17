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

test('a DM builds a combat from new units, a duplicate and a Library preset', async ({ page }) => {
  await signUp(page);
  await createCombat(page, 'Goblin ambush');
  await expect(page.getByText('No units yet')).toBeVisible();
  await expect(page.getByRole('button', { name: /Start combat/ })).toBeDisabled();

  await addUnit(page, 'Aria', 'Hero');
  await addUnit(page, 'Grak', 'Enemy');
  await addUnit(page, 'Bran', 'Ally');
  await expect(unitRow(page, 'Aria')).toHaveAttribute('data-unit-role', 'hero');
  await expect(unitRow(page, 'Grak')).toHaveAttribute('data-unit-role', 'enemy');
  await expect(unitRow(page, 'Bran')).toHaveAttribute('data-unit-role', 'ally');
  expect(await unitNames(page)).toEqual(['Aria', 'Grak', 'Bran']);

  await openUnitMenu(page, 'Grak', 'Duplicate');
  await expect(unitRow(page, 'Grak 2')).toBeVisible();
  await expect(unitRow(page, 'Grak 2')).toHaveAttribute('data-unit-role', 'enemy');
  expect(await unitNames(page)).toEqual(['Aria', 'Grak', 'Grak 2', 'Bran']);

  await openUnitMenu(page, 'Bran', 'Save as preset');
  await expect(page.getByRole('status').getByText('Bran added to Library')).toBeVisible();

  await openCombatMenu(page, 'Add unit');
  const form = page.getByRole('dialog', { name: 'Add unit' });
  await form.getByRole('radio', { name: 'From Library' }).click();
  await form.getByRole('group', { name: 'Presets' }).getByRole('button', { name: /Bran/ }).click();
  await form.getByRole('button', { name: /^Add Bran/ }).click();
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
  await addUnit(page, 'Aria', 'Hero');
  await addUnit(page, 'Grak', 'Enemy');
  await addUnit(page, 'Bran', 'Ally');
  await expect(page.getByRole('button', { name: /Edit round/ })).toBeHidden();

  await page.getByRole('button', { name: /Start combat/ }).click();
  await expect(page.getByRole('button', { name: 'Edit round, round 1' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Set escalation die, escalation 0' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Start combat/ })).toBeHidden();

  const order = await initiatives(page);
  expect(order).toHaveLength(3);
  for (const value of order) expect(value).toBeGreaterThanOrEqual(1);
  expect(order).toEqual([...order].sort((a, b) => b - a));
  await expect(unitRows(page).first()).toHaveAttribute('data-active', 'true');
  const names = await unitNames(page);
  expect([...names].sort()).toEqual(['Aria', 'Bran', 'Grak']);

  const nextTurn = page.getByRole('button', { name: /^Next turn/ });
  await expect(nextTurn).toContainText(names[1] ?? '');
  await nextTurn.click();
  await expect(unitRow(page, names[1] ?? '')).toHaveAttribute('data-active', 'true');
  await nextTurn.click();
  await expect(unitRow(page, names[2] ?? '')).toHaveAttribute('data-active', 'true');
  await expect(nextTurn).toContainText(`${names[0]} · round 2`);
  await expect(page.getByRole('button', { name: 'Edit round, round 1' })).toBeVisible();

  await nextTurn.click();
  await expect(page.getByRole('button', { name: 'Edit round, round 2' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Set escalation die, escalation 1' }),
  ).toBeVisible();
  await expect(unitRow(page, names[0] ?? '')).toHaveAttribute('data-active', 'true');

  await page.reload();
  await expect(page.getByRole('button', { name: 'Edit round, round 2' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Set escalation die, escalation 1' }),
  ).toBeVisible();
});

test('Undo reverts the last action and shows the Undid toast', async ({ page }) => {
  await signUp(page);
  await createCombat(page, 'Crypt');
  await addUnit(page, 'Aria', 'Hero');
  await addUnit(page, 'Grak', 'Enemy');
  await page.getByRole('button', { name: /Start combat/ }).click();
  await expect(page.getByRole('button', { name: 'Edit round, round 1' })).toBeVisible();
  await expect(unitRows(page).first()).toHaveAttribute('data-active', 'true');
  const names = await unitNames(page);
  const nextTurn = page.getByRole('button', { name: /^Next turn/ });
  await nextTurn.click();
  await nextTurn.click();
  await expect(page.getByRole('button', { name: 'Edit round, round 2' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Set escalation die, escalation 1' }),
  ).toBeVisible();

  await openCombatMenu(page, 'Undo');
  await expect(page.getByRole('status').getByText('Undid: next turn')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit round, round 1' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Set escalation die, escalation 0' }),
  ).toBeVisible();
  await expect(unitRow(page, names[1] ?? '')).toHaveAttribute('data-active', 'true');

  await openUnitMenu(page, 'Grak', 'Duplicate');
  await expect(unitRow(page, 'Grak 2')).toBeVisible();
  await openCombatMenu(page, 'Undo');
  await expect(page.getByRole('status').getByText('Undid: copy of Grak')).toBeVisible();
  await expect(unitRow(page, 'Grak 2')).toHaveCount(0);

  await page.reload();
  await expect(unitRows(page)).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Edit round, round 1' })).toBeVisible();
});

test('a closed Sort sheet leaves nothing over the combat list', async ({ page }) => {
  await signUp(page);
  await createCombat(page, 'Old keep');
  await page.goto('/combats');
  await expect(page.getByText('Old keep')).toBeVisible();

  await page.getByRole('button', { name: 'Sort', exact: true }).click();
  const sort = page.getByRole('dialog', { name: 'Sort combats' });
  await expect(sort).toBeVisible();
  await sort.getByRole('button', { name: 'Done' }).click();
  await expect(sort).toBeHidden();

  await page.getByRole('button', { name: 'New combat' }).click({ timeout: 3_000 });
  const sheet = page.getByRole('dialog', { name: 'New combat' });
  await expect(sheet).toBeVisible();
  await sheet.getByLabel('Title').fill('After sort');
  await sheet.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'After sort' })).toBeVisible();
});
