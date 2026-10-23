import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import {
  base,
  combatColors,
  conditionNames,
  conditions,
  health,
  hpActions,
  roles,
} from '../../theme.ts';
import { ThemeAudit } from './ThemeAudit.tsx';

const meta = preview.meta({
  component: ThemeAudit,
  parameters: {
    geometry: {
      overflow: 'the audit table pins token samples to fixed columns; it is not product UI',
      truncation: 'the audit table clips token names to fixed columns; it is not product UI',
    },
  },
});

const groupOrder = [
  'Base',
  'Roles',
  'Health',
  'HP actions',
  'Conditions (fill / text)',
  'Combat colours',
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
  ...combatColors,
];

export const Tokens = meta.story({
  tags: ['visual'],
  play: async ({ canvas, canvasElement }) => {
    const headings = canvas.getAllByRole('heading').map((heading) => heading.textContent);
    await expect(headings).toEqual(groupOrder);
    const fills = [...canvasElement.querySelectorAll<HTMLElement>('[data-hex]')].map(
      (swatch) => swatch.dataset.hex,
    );
    await expect(fills).toEqual(expectedFills);
    await expect(fills).toContain(health.unconscious);
    await expect(combatColors[7]).toBe('#8C8578');
    await expect(
      getComputedStyle(document.documentElement).getPropertyValue('--cp-combat-7').trim(),
    ).toBe('#8C8578');
    await expect(document.documentElement.dataset.motion).toBe('off');
    const swatch = canvasElement.querySelector('[data-hex]');
    await expect(swatch && getComputedStyle(swatch).transitionDuration).toBe('0s');
  },
});
