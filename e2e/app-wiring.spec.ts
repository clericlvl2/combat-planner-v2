import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { signUp } from './helpers.ts';

async function swipeFromLeftEdge(page: Page): Promise<void> {
  await page.evaluate(() => {
    const send = (type: string, clientX: number, clientY: number) =>
      document.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 7,
          pointerType: 'touch',
          isPrimary: true,
          clientX,
          clientY,
          bubbles: true,
        }),
      );
    send('pointerdown', 4, 400);
    for (const step of [1, 2, 3, 4, 5, 6]) send('pointermove', 4 + step * 19, 400 + step);
    send('pointerup', 120, 406);
  });
}

test('a swipe from the left edge opens the drawer, but not over an open sheet', async ({
  page,
}) => {
  await signUp(page);
  const drawer = page.getByRole('dialog', { name: 'Combat Planner' });

  await page.getByRole('button', { name: 'New combat' }).click();
  const sheet = page.getByRole('dialog', { name: 'New combat' });
  await expect(sheet).toBeVisible();
  await swipeFromLeftEdge(page);
  await expect(drawer).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();

  await swipeFromLeftEdge(page);
  await expect(drawer).toBeVisible();
});

test('sign-in returns to the browser language after a DM signs out in another', async ({
  page,
}) => {
  await signUp(page);
  await page.goto('/settings');
  await page
    .getByRole('radiogroup', { name: 'Language' })
    .getByRole('radio', { name: 'Deutsch' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible();

  await swipeFromLeftEdge(page);
  await page.getByRole('dialog', { name: 'Combat Planner' }).getByText('Konto').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Konto' })).toBeVisible();
  await page.getByRole('button', { name: 'Abmelden' }).click();

  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
});
