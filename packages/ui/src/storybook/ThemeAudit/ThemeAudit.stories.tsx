import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { base, conditionNames, conditions, health, hpActions, roles } from '../../theme.ts';
import { ThemeAudit } from './ThemeAudit.tsx';

const meta = preview.meta({
  component: ThemeAudit,
});

const groupOrder = [
  'Base',
  'Roles',
  'Health',
  'HP actions',
  'Conditions (fill / text)',
  'Typefaces',
  'Type scale',
  'Radii',
  'Spacing',
];

const expectedFills = [
  ...Object.values(base),
  ...Object.values(roles),
  ...Object.values(health),
  ...Object.values(hpActions),
  ...conditionNames.map((name) => conditions[name].fill),
];

export const Tokens = meta.story({
  play: async ({ canvas, canvasElement }) => {
    const headings = canvas.getAllByRole('heading').map((heading) => heading.textContent);
    await expect(headings).toEqual(groupOrder);
    const fills = [...canvasElement.querySelectorAll<HTMLElement>('[data-hex]')].map(
      (swatch) => swatch.dataset.hex,
    );
    await expect(fills).toEqual(expectedFills);
    await expect(document.documentElement.dataset.motion).toBe('off');
    const swatch = canvasElement.querySelector('[data-hex]');
    await expect(swatch && getComputedStyle(swatch).transitionDuration).toBe('0s');
  },
});
