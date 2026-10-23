import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import {
  addUnit,
  createCombat,
  joinAsPlayer,
  newPlayerContext,
  shareLink,
  signIn,
  signUp,
  unitRows,
} from './helpers.ts';
import type { Credentials } from './helpers.ts';
import { t } from './t.ts';

interface Prepared {
  link: string;
  credentials: Credentials;
}

test.setTimeout(90_000);

let playerContext: BrowserContext;
let player: Page;

test.beforeEach(async ({ browser }) => {
  playerContext = await newPlayerContext(browser);
  player = await playerContext.newPage();
});

test.afterEach(async () => {
  await playerContext.close();
});

async function prepareCombat(page: Page, title: string): Promise<Prepared> {
  const credentials = await signUp(page);
  await createCombat(page, title);
  await addUnit(page, 'Aria', 'hero');
  return { link: await shareLink(page), credentials };
}

async function signOut(page: Page): Promise<void> {
  await page.goto('/account');
  await page.getByRole('button', { name: t('Account:signOut'), exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}

const offline = (page: Page) =>
  page.getByRole('heading', { name: t('MessageScreen:offlineTitle') });

const expired = (page: Page) =>
  page.getByRole('heading', { level: 1, name: t('MessageScreen:linkRevokedTitle') });

const retry = (page: Page) => page.getByRole('button', { name: t('MessageScreen:tryAgain') });

const ownHero = (page: Page) => unitRows(page).filter({ hasText: 'Aria' });

test('a player who claims nothing is dropped and «Повторить» brings them back', async ({
  page,
}) => {
  const { link } = await prepareCombat(page, 'Watchers');
  await player.goto(link);
  await expect(player.getByRole('heading', { name: t('Heroes:title') })).toBeVisible();
  await expect(offline(player)).toBeVisible({ timeout: 20_000 });
  await retry(player).click();
  await expect(player.getByRole('heading', { name: t('Heroes:title') })).toBeVisible();
  await player.getByLabel(t('Heroes:nameLabel')).fill('Pat');
  await player.getByRole('checkbox', { name: 'Aria' }).check();
  await player.getByRole('button', { name: t('Heroes:join') }).click();
  await expect(ownHero(player)).toHaveAttribute('data-mine', 'true');
});

test('a DM signing out everywhere leaves players playing until the link turns off', async ({
  page,
}) => {
  const { link } = await prepareCombat(page, 'Orphans');
  await joinAsPlayer(player, link, 'Pat', 'Aria');
  await signOut(page);
  await player.waitForTimeout(5_000);
  await expect(ownHero(player)).toHaveAttribute('data-mine', 'true');
  await expect(expired(player)).toBeHidden();
  await expect(expired(player)).toBeVisible({ timeout: 20_000 });
});

test('a DM who signs in again before the timeout keeps the link', async ({ page }) => {
  const { link, credentials } = await prepareCombat(page, 'Returning');
  await joinAsPlayer(player, link, 'Pat', 'Aria');
  await signOut(page);
  await signIn(page, credentials.email, credentials.password);
  await expect(page).toHaveURL(/\/combats$/);
  await player.waitForTimeout(13_000);
  await expect(expired(player)).toBeHidden();
  await player.reload();
  await expect(ownHero(player)).toHaveAttribute('data-mine', 'true');
});

test('an idle player stream drops and «Повторить» restores the claim', async ({ page }) => {
  const { link } = await prepareCombat(page, 'Idlers');
  await joinAsPlayer(player, link, 'Pat', 'Aria');
  await expect(offline(player)).toBeVisible({ timeout: 45_000 });
  await retry(player).click();
  await expect(ownHero(player)).toHaveAttribute('data-mine', 'true');
});
