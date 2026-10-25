import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { addUnit, createCombat, signUp, unitRow } from './helpers.ts';
import { escapeRegExp, t } from './t.ts';

const hpButton = (page: Page, name: string, hp: string) =>
  unitRow(page, name).getByRole('button', { name: new RegExp(`^${escapeRegExp(hp)}`) });

const changeHp = async (page: Page, name: string, hp: string, digits: string, action: string) => {
  await hpButton(page, name, hp).click();
  const numpad = page.getByRole('dialog', { name });
  const keypad = numpad.getByRole('group', { name: t('NumpadSheet:keypad') });
  for (const digit of digits) {
    await keypad.getByRole('button', { name: digit }).click();
  }
  await numpad.getByRole('button', { name: t(`NumpadSheet:${action}`) }).click();
  await expect(numpad).toBeHidden();
};

test('a hero beaten far below 0 HP stays unconscious and a heal counts from 0', async ({
  page,
}) => {
  await signUp(page);
  await createCombat(page, 'Last stand');
  await addUnit(page, 'Aria', 'hero');
  await addUnit(page, 'Grak', 'enemy');

  await changeHp(page, 'Aria', '10 /10', '20', 'damage');
  await expect(hpButton(page, 'Aria', `−10 /10 ${t('HpBox:unconscious')}`)).toBeVisible();
  await expect(unitRow(page, 'Aria')).not.toHaveAttribute('data-dead');

  await changeHp(page, 'Grak', '10 /10', '10', 'damage');
  await expect(hpButton(page, 'Grak', `0 /10 ${t('HpBox:dead')}`)).toBeVisible();

  await changeHp(page, 'Aria', '−10 /10', '5', 'heal');
  await expect(hpButton(page, 'Aria', '5 /10')).toBeVisible();

  await page.reload();
  await expect(hpButton(page, 'Aria', '5 /10')).toBeVisible();
});
