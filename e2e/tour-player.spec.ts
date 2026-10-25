import { expect, test } from '@playwright/test';
import { addUnit, createCombat, shareLink, signUp, tourStep, uniqueClientIp } from './helpers.ts';
import { containsT, t } from './t.ts';
import { emptyStorage } from './tourStorage.ts';

test('a new player walks the tour and sees the turn strip hint once', async ({ page, browser }) => {
  await signUp(page);
  await createCombat(page, 'Засада гоблинов');
  await addUnit(page, 'Тарин', 'hero');
  await addUnit(page, 'Гоблин', 'enemy');
  const link = await shareLink(page);
  await page
    .getByRole('dialog', { name: t('ShareSheet:title') })
    .getByRole('button', { name: t('Sheet:close') })
    .click();

  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    locale: 'ru-RU',
    storageState: emptyStorage,
    extraHTTPHeaders: { 'x-forwarded-for': uniqueClientIp() },
  });
  try {
    const player = await context.newPage();
    const step = (key: string, current: number | null) => tourStep(player, 'player', key, current);
    const tooltips = player.locator('[data-tour-tooltip]');
    await player.goto(link);

    await step('playerName', 1);
    await player.getByLabel(t('Heroes:nameLabel')).fill('Саша');
    const hero = await step('playerHero', 1);
    await hero.getByRole('button', { name: t('Tour:next') }).click();
    await expect(player.getByRole('checkbox', { name: 'Тарин' })).toBeChecked();
    await step('playerJoin', 1);
    await player.getByRole('button', { name: t('Heroes:join') }).click();

    const intro = await step('playerIntro', 2);
    await expect(intro).toContainText(t('Tour:playerIntroBody'));
    await intro.getByRole('button', { name: t('Tour:next') }).click();

    await step('playerInitiative', 3);
    await player.locator("[data-tour='own-row'] [data-tour='initiative']").click();
    await step('playerRoll', 3);
    await player.locator("[data-tour='roll']").click();

    await step('playerHp', 4);
    await player.locator("[data-tour='own-row'] [data-tour='hp']").click();
    const apply = await step('playerHpApply', 4);
    await expect(apply).toContainText(t('Tour:playerHpApplyBody'));
    await expect(apply.getByRole('button', { name: t('Tour:gotIt') })).toBeVisible();
    const numpad = player.getByRole('dialog', { name: 'Тарин' });
    await numpad.getByRole('button', { name: '3', exact: true }).click();
    await numpad.getByRole('button', { name: t('NumpadSheet:damage') }).click();
    await expect(numpad).toBeHidden();

    const expand = await step('playerExpand', 5);
    await expand.getByRole('button', { name: t('Tour:next') }).click();
    const menu = await step('playerMenu', 6);
    await menu.getByRole('button', { name: t('Tour:gotIt') }).click();
    await expect(tooltips).toHaveCount(0);

    await page.getByRole('button', { name: containsT('TurnBar:startCombat') }).click();
    const strip = await step('playerTurn', null);
    await expect(strip.getByRole('button', { name: t('Tour:skip') })).toHaveCount(0);
    await strip.getByRole('button', { name: t('Tour:gotIt') }).click();
    await expect(tooltips).toHaveCount(0);

    await player.reload();
    await expect(player.getByText('Тарин', { exact: true })).toBeVisible();
    await player.waitForTimeout(500);
    await expect(tooltips).toHaveCount(0);
  } finally {
    await context.close();
  }
});
