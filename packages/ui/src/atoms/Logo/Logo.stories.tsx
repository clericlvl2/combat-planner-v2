import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { Logo } from './Logo.tsx';

const meta = preview.meta({
  title: 'Atoms/Logo',
  component: Logo,
  args: { size: 64 },
});

const logoOf = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<SVGSVGElement>('[data-logo]');

export const Default = meta.story({
  tags: ['visual'],
  play: async ({ canvasElement }) => {
    const logo = logoOf(canvasElement);
    await expect(logo).toHaveAttribute('aria-hidden', 'true');
    await expect(logo?.getBoundingClientRect().width).toBe(64);
    await expect(logo?.getBoundingClientRect().height).toBe(64);
    await expect(logo?.querySelector('path')).toHaveAttribute('fill-rule', 'evenodd');
  },
});

export const FollowsTextColor = meta.story({
  tags: ['!dev'],
  args: { size: 24 },
  render: (args) => (
    <span style={{ color: 'rgb(30, 95, 168)' }}>
      <Logo {...args} />
    </span>
  ),
  play: async ({ canvasElement }) => {
    const path = logoOf(canvasElement)?.querySelector('path');
    await expect(path === null || path === undefined ? '' : getComputedStyle(path).fill).toBe(
      'rgb(30, 95, 168)',
    );
  },
});

export const LabelledIsImage = meta.story({
  tags: ['!dev'],
  args: { 'aria-hidden': false, role: 'img', 'aria-label': 'Combat Planner' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Combat Planner' })).toBeVisible();
  },
});
