import { expect, test } from '@playwright/test';

test('a DM runs a combat and a player follows the turn order', async ({ page, browser }) => {
  const email = `dm-${Date.now().toString(36)}@example.com`;

  await page.goto('/');
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await page.goto('/auth/sign-up');
  await page.getByLabel('Display name').fill('Dana');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct-horse-battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/combats$/);
  await expect(page.getByText('No combats yet')).toBeVisible();

  await page.getByRole('button', { name: 'New combat' }).click();
  await page.getByLabel('Title').fill('Goblin ambush');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page).toHaveURL(/\/combats\/[0-9A-Z]{26}$/);

  await page.getByRole('button', { name: 'Add unit' }).first().click();
  await page.getByLabel('Name').fill('Aria');
  await page.getByRole('radiogroup', { name: 'Type' }).getByRole('radio', { name: 'Hero' }).click();
  await page.getByRole('button', { name: 'Add unit' }).last().click();
  await expect(page.getByText('Aria')).toBeVisible();

  await page.getByRole('button', { name: 'Start combat' }).click();
  await expect(page.getByText('Round 1')).toBeVisible();
  await page.getByRole('button', { name: 'Next turn' }).click();
  await expect(page.getByText('Round 2')).toBeVisible();

  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Share' }).click();
  const link = await page.getByText(/\/play\?t=/).textContent();
  expect(link).toMatch(/^http:\/\/localhost:3000\/combats\/[0-9A-Z]{26}\/play\?t=.+/);

  const playerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const player = await playerContext.newPage();
    await player.goto(link ?? '');
    await expect(player.getByRole('heading', { name: 'Who are you playing?' })).toBeVisible();
    await player.getByLabel('Your name').fill('Pat');
    await player.getByRole('checkbox', { name: 'Aria' }).check();
    await player.getByRole('button', { name: 'Join' }).click();
    await expect(player.getByText('Round 2')).toBeVisible();
    await expect(player.getByText('Aria')).toBeVisible();
    await expect(player.getByText('You', { exact: true })).toBeVisible();
  } finally {
    await playerContext.close();
  }
});
