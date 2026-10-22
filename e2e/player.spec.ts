import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import {
  addUnit,
  createCombat,
  initiatives,
  joinAsPlayer,
  newPlayerContext,
  openCombatMenu,
  openUnitMenu,
  rowInitiatives,
  rowOrder,
  shareLink,
  signUp,
  unitRow,
  unitRows,
} from './helpers.ts';
import { containsT, startsWithT, t } from './t.ts';

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
  await addUnit(page, 'Aria', 'hero');
  await addUnit(page, 'Grak', 'enemy');
  await addUnit(page, 'Bran', 'ally');
  return shareLink(page);
}

test('a player claims a hero and sees the turn order after Start', async ({ page }) => {
  const link = await prepareCombat(page, 'Goblin ambush');
  await joinAsPlayer(player, link, 'Pat', 'Aria');
  await expect(
    player.getByRole('banner').getByText(t('CombatHeader:setup'), { exact: true }),
  ).toBeVisible();
  await expect(player.getByText(t('TurnOrder:waiting'))).toBeVisible();
  await expect(unitRows(player).filter({ hasText: 'Aria' })).toContainText(t('RoleBlock:you'));
  await expect(
    unitRows(player).getByRole('img', { name: t('RoleBlock:noInitiative') }),
  ).toHaveCount(3);

  await page
    .getByRole('dialog', { name: t('ShareSheet:title') })
    .getByRole('button', { name: t('Sheet:close') })
    .click();
  await expect(unitRow(page, 'Aria').getByText('@Pat', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: containsT('TurnBar:startCombat') }).click();
  await expect(
    page.getByRole('button', { name: t('CombatHeader:editRound', { round: 1 }) }),
  ).toBeVisible();

  await expect(
    player.getByRole('banner').getByText(`${t('CombatHeader:round')} 1`, { exact: true }),
  ).toBeVisible();
  await expect(player.getByText(t('TurnOrder:waiting'))).toBeHidden();
  await expect(unitRows(player)).toHaveCount(3);
  await expect(
    unitRows(player).getByRole('img', { name: t('RoleBlock:noInitiative') }),
  ).toHaveCount(0);
  await expect(unitRows(player).first()).toHaveAttribute('data-active', 'true');
  const dmOrder = await rowOrder(page, NAMES);
  const dmValues = await initiatives(page);
  expect(dmValues).toHaveLength(3);
  for (const value of dmValues) expect(value).toBeGreaterThanOrEqual(1);
  expect(dmValues).toEqual([...dmValues].sort((a, b) => b - a));
  expect([...dmOrder].sort()).toEqual([...NAMES].sort());
  expect(await rowOrder(player, NAMES)).toEqual(dmOrder);
  expect(await rowInitiatives(player)).toEqual(dmValues);

  await page.getByRole('button', { name: startsWithT('TurnBar:nextTurn') }).click();
  await expect(unitRows(player).nth(1)).toHaveAttribute('data-active', 'true');
  expect(await rowOrder(player, NAMES)).toEqual(dmOrder);
});

test('a player damages their own hero and the DM sees it without a reload', async ({ page }) => {
  const link = await prepareCombat(page, 'Bridge fight');
  await joinAsPlayer(player, link, 'Pat', 'Aria');
  await page
    .getByRole('dialog', { name: t('ShareSheet:title') })
    .getByRole('button', { name: t('Sheet:close') })
    .click();
  await page.getByRole('button', { name: containsT('TurnBar:startCombat') }).click();
  await expect(
    player.getByRole('banner').getByText(`${t('CombatHeader:round')} 1`, { exact: true }),
  ).toBeVisible();
  await expect(unitRow(page, 'Aria').getByRole('button', { name: '10 /10' })).toBeVisible();
  await page.evaluate(() => Reflect.set(window, 'e2eNoReload', true));

  const ownRow = unitRows(player).filter({ hasText: 'Aria' });
  await ownRow.getByRole('button', { name: /^10 \/10/ }).click();
  const numpad = player.getByRole('dialog', { name: 'Aria' });
  await expect(numpad.getByRole('button', { name: t('NumpadSheet:setMax') })).toHaveCount(0);
  await numpad
    .getByRole('group', { name: t('NumpadSheet:keypad') })
    .getByRole('button', { name: '3' })
    .click();
  await numpad.getByRole('button', { name: t('NumpadSheet:damage') }).click();
  await expect(numpad).toBeHidden();
  await expect(ownRow.getByRole('button', { name: /^7 \/10/ })).toBeVisible();

  await expect(unitRow(page, 'Aria').getByRole('button', { name: '7 /10' })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, 'e2eNoReload'))).toBe(true);
});

test('a reissued link expires the old one and releases the claim', async ({ page }) => {
  const link = await prepareCombat(page, 'Crypt');
  await joinAsPlayer(player, link, 'Pat', 'Aria');
  const sheet = page.getByRole('dialog', { name: t('ShareSheet:title') });
  await expect(unitRow(page, 'Aria').getByText('@Pat', { exact: true })).toHaveCount(1);

  await sheet.getByRole('button', { name: t('ShareSheet:reissue') }).click();
  const confirm = page.getByRole('alertdialog', { name: t('Dialog:revokeTitle') });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: t('Dialog:revoke') }).click();
  await expect(confirm).toBeHidden();
  await expect(sheet.locator('[data-url]')).not.toHaveText(link);
  const newLink = (await sheet.locator('[data-url]').textContent()) ?? '';
  expect(newLink).toMatch(/\/play\?t=/);

  await expect(
    player.getByRole('heading', { name: t('MessageScreen:linkRevokedTitle') }),
  ).toBeVisible();
  await player.goto(link);
  await expect(
    player.getByRole('heading', { name: t('MessageScreen:linkRevokedTitle') }),
  ).toBeVisible();

  await sheet.getByRole('button', { name: t('Sheet:close') }).click();
  await expect(unitRow(page, 'Aria').getByText('@Pat', { exact: true })).toHaveCount(0);

  await player.goto(newLink);
  await expect(player.getByRole('heading', { name: t('Heroes:title') })).toBeVisible();
  await expect(player.getByRole('checkbox', { name: 'Aria' })).not.toBeChecked();
  await expect(player.getByRole('checkbox', { name: 'Aria' })).toBeEnabled();
});

test('a player sees Combat deleted when the DM deletes the combat', async ({ page }) => {
  const link = await prepareCombat(page, 'Old keep');
  await joinAsPlayer(player, link, 'Pat', 'Aria');

  await page.goto('/combats');
  await page.getByRole('button', { name: t('CombatCard:details', { title: 'Old keep' }) }).click();
  await page.getByRole('button', { name: t('CardActions:more') }).click();
  await page.getByRole('menuitem', { name: t('CombatCard:delete') }).click();
  const confirm = page.getByRole('alertdialog', {
    name: t('Dialog:deleteCombatTitle', { name: 'Old keep' }),
  });
  await confirm.getByRole('button', { name: t('Dialog:delete') }).click();
  await expect(
    page.getByRole('status').getByText(t('Toast:deleted', { title: 'Old keep' })),
  ).toBeVisible();
  await expect(page.getByText(t('EmptyState:noCombatsTitle'))).toBeVisible();

  await expect(
    player.getByRole('heading', { name: t('CombatDeleted:title', { title: 'Old keep' }) }),
  ).toBeVisible();
  await expect(player.getByText(t('MessageScreen:combatDeletedBody'))).toBeVisible();
});

async function closeShare(page: Page): Promise<void> {
  const sheet = page.getByRole('dialog', { name: t('ShareSheet:title') });
  await sheet.getByRole('button', { name: t('Sheet:close') }).click();
  await expect(sheet).toBeHidden();
}

test('a DM restart shows the player a toast and the setup', async ({ page }) => {
  const link = await prepareCombat(page, 'Second try');
  await joinAsPlayer(player, link, 'Pat', 'Aria');
  await closeShare(page);
  await page.getByRole('button', { name: containsT('TurnBar:startCombat') }).click();
  await expect(
    player.getByRole('banner').getByText(`${t('CombatHeader:round')} 1`, { exact: true }),
  ).toBeVisible();

  await openCombatMenu(page, t('CombatHeader:restart'));
  const confirm = page.getByRole('alertdialog', { name: t('Dialog:restartTitle') });
  await confirm.getByRole('button', { name: t('Dialog:restart') }).click();

  await expect(player.getByText(t('Toast:dmRestarted'))).toBeVisible();
  await expect(
    player.getByRole('banner').getByText(t('CombatHeader:setup'), { exact: true }),
  ).toBeVisible();
});

test('a DM clear shows the player a toast and no units', async ({ page }) => {
  const link = await prepareCombat(page, 'Clean slate');
  await joinAsPlayer(player, link, 'Pat', 'Aria');
  await closeShare(page);

  await openCombatMenu(page, t('CombatHeader:clear'));
  const confirm = page.getByRole('alertdialog', { name: t('Dialog:clearTitle') });
  await confirm.getByRole('button', { name: t('Dialog:clear') }).click();

  await expect(player.getByText(t('Toast:dmCleared'))).toBeVisible();
  await expect(player.getByRole('heading', { name: t('TurnOrder:noUnitsTitle') })).toBeVisible();
});

test('a DM release sends the player back to Heroes with a toast', async ({ page }) => {
  const link = await prepareCombat(page, 'Released');
  await joinAsPlayer(player, link, 'Pat', 'Aria');
  await closeShare(page);

  await openUnitMenu(page, 'Aria', t('UnitRow:releaseClaim'));

  await expect(player.getByText(t('Toast:dmReleased', { hero: 'Aria' }))).toBeVisible();
  await expect(player.getByRole('heading', { name: t('Heroes:title') })).toBeVisible();
  await expect(player.getByRole('checkbox', { name: 'Aria' })).not.toBeChecked();
});

test('a DM removal of the hero sends the player back to Heroes with a toast', async ({ page }) => {
  const link = await prepareCombat(page, 'Removed');
  await joinAsPlayer(player, link, 'Pat', 'Aria');
  await closeShare(page);

  await openUnitMenu(page, 'Aria', t('UnitRow:remove'));
  const confirm = page.getByRole('alertdialog', {
    name: t('Dialog:removeTitle', { name: 'Aria' }),
  });
  await confirm.getByRole('button', { name: t('Dialog:remove') }).click();

  await expect(player.getByText(t('Toast:dmRemoved', { hero: 'Aria' }))).toBeVisible();
  await expect(player.getByRole('heading', { name: t('Heroes:title') })).toBeVisible();
  await expect(player.getByRole('checkbox', { name: 'Aria' })).toHaveCount(0);
});

test('when two players pick the same hero, the second sees it taken', async ({ page, browser }) => {
  const link = await prepareCombat(page, 'Contested');
  const secondContext = await newPlayerContext(browser);
  const second = await secondContext.newPage();
  try {
    await second.goto(link);
    await second.getByLabel(t('Heroes:nameLabel')).fill('Sam');
    await second.getByRole('checkbox', { name: 'Aria' }).check();

    await joinAsPlayer(player, link, 'Pat', 'Aria');

    await expect(second.getByText(t('Toast:heroTaken', { hero: 'Aria' }))).toBeVisible();
    await expect(second.getByRole('checkbox', { name: 'Aria' })).toBeDisabled();
    await expect(second.getByRole('checkbox', { name: 'Aria' })).not.toBeChecked();
    await expect(second.getByText(t('Heroes:playing', { name: 'Pat' }))).toBeVisible();
    await expect(second.getByRole('button', { name: t('Heroes:join') })).toBeDisabled();
  } finally {
    await secondContext.close();
  }
});
