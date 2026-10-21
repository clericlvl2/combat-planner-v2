import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { signUp } from './helpers.ts';
import { t } from './t.ts';

const DE = { lng: 'de' } as const;

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
  const drawer = page.getByRole('dialog', { name: t('Drawer:title') });

  await page.getByRole('button', { name: t('BottomBar:newCombat') }).click();
  const sheet = page.getByRole('dialog', { name: t('CombatFormSheet:newCombat') });
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
    .getByRole('radiogroup', { name: t('Settings:language') })
    .getByRole('radio', { name: 'Deutsch' })
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: t('Settings:title', DE) }),
  ).toBeVisible();

  await swipeFromLeftEdge(page);
  await page
    .getByRole('dialog', { name: t('Drawer:title', DE) })
    .getByText(t('Drawer:account', DE))
    .click();
  await expect(page.getByRole('heading', { level: 1, name: t('Account:title', DE) })).toBeVisible();
  await page.getByRole('button', { name: t('Account:signOut', DE) }).click();

  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await expect(page.getByRole('heading', { level: 1, name: t('SignIn:title') })).toBeVisible();
});
