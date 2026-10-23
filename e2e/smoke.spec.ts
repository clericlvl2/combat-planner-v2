import { expect, test } from '@playwright/test';
import { containsT, escapeRegExp, t } from './t.ts';

test('a DM runs a combat and a player follows the turn order', async ({
  page,
  browser,
  baseURL,
}) => {
  const email = `dm-${Date.now().toString(36)}@example.com`;

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: t('Landing:title') })).toBeVisible();
  await page.goto('/auth/sign-up');
  await page.getByLabel(t('SignUp:displayName')).fill('Dana');
  await page.getByLabel(t('SignUp:email')).fill(email);
  await page.getByLabel(t('SignUp:password')).fill('correct-horse-battery');
  await page.getByRole('button', { name: t('SignUp:submit') }).click();
  await expect(page).toHaveURL(/\/combats$/);
  await expect(page.getByText(t('EmptyState:noCombatsTitle'))).toBeVisible();

  await page.getByRole('button', { name: t('BottomBar:newCombat') }).click();
  await page.getByLabel(t('CombatFormSheet:title')).fill('Goblin ambush');
  await page.getByRole('button', { name: t('CombatFormSheet:create'), exact: true }).click();
  await expect(page).toHaveURL(/\/combats$/);
  await page.getByRole('button', { name: new RegExp(`^${escapeRegExp('Goblin ambush')}`) }).click();
  await expect(page).toHaveURL(/\/combats\/[0-9A-Z]{26}$/);

  await page.getByRole('button', { name: t('EmptyState:addUnit') }).click();
  await page.getByLabel(t('UnitForm:name')).fill('Aria');
  await page
    .getByRole('radiogroup', { name: t('UnitForm:type') })
    .getByRole('radio', { name: t('UnitForm:hero') })
    .click();
  await page
    .getByRole('dialog', { name: t('UnitForm:addTitle') })
    .getByRole('button', { name: t('UnitForm:addUnit') })
    .click();
  await expect(page.getByText('Aria')).toBeVisible();

  await page.getByRole('button', { name: containsT('TurnBar:startCombat') }).click();
  await expect(
    page.getByRole('button', { name: t('CombatHeader:editRound', { round: 1 }) }),
  ).toBeVisible();
  await page.getByRole('button', { name: containsT('TurnBar:nextTurn') }).click();
  await expect(
    page.getByRole('button', { name: t('CombatHeader:editRound', { round: 2 }) }),
  ).toBeVisible();

  await page.getByRole('button', { name: t('CombatHeader:menu'), exact: true }).click();
  await page.getByRole('menuitem', { name: t('CombatHeader:share') }).click();
  const link = await page.getByText(/\/play\?t=/).textContent();
  expect(link).toMatch(
    new RegExp(`^${escapeRegExp(baseURL ?? '')}/combats/[0-9A-Z]{26}/play\\?t=.+`),
  );

  const playerContext = await browser.newContext({
    viewport: { width: 320, height: 568 },
    locale: 'ru-RU',
  });
  try {
    const player = await playerContext.newPage();
    await player.goto(link ?? '');
    await expect(player.getByRole('heading', { name: t('Heroes:title') })).toBeVisible();
    await player.getByLabel(t('Heroes:nameLabel')).fill('Pat');
    await player.getByRole('checkbox', { name: 'Aria' }).check();
    await player.getByRole('button', { name: t('Heroes:join') }).click();
    await expect(
      player.getByRole('banner').getByText(`${t('CombatHeader:round')} 2`, { exact: true }),
    ).toBeVisible();
    await expect(player.getByRole('heading', { name: t('Heroes:title') })).toBeHidden();
    await expect(player.getByText('Aria', { exact: true })).toBeVisible();
    await expect(player.getByText(t('RoleBlock:you'), { exact: true })).toBeVisible();
  } finally {
    await playerContext.close();
  }
});
