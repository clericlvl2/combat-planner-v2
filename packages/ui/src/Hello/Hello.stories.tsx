import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { Hello } from './Hello.tsx';

const meta = preview.meta({
  component: Hello,
  args: { name: 'Combat Planner' },
});

export const Default = meta.story({
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Hello, Combat Planner')).toBeVisible();
  },
});
