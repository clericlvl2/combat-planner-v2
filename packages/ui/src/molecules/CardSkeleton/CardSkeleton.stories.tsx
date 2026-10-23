import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { CardSkeleton } from './CardSkeleton.tsx';

const meta = preview.meta({
  title: 'Molecules/CardSkeleton',
  component: CardSkeleton,
});

const variants = [
  { label: 'Combat', variant: 'combat' },
  { label: 'Preset', variant: 'preset' },
  { label: 'Unit', variant: 'unit' },
] as const;

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => (
    <StateGrid
      columns={['Two cards']}
      rows={variants.map(({ label, variant }) => ({
        label,
        render: () => (
          <div style={{ width: 272 }}>
            <CardSkeleton variant={variant} count={2} />
          </div>
        ),
      }))}
    />
  ),
  play: async ({ canvasElement }) => {
    const lists = canvasElement.querySelectorAll('[data-card-skeleton]');
    await expect(lists).toHaveLength(3);
    for (const list of lists) {
      await expect(list).toHaveAttribute('aria-hidden', 'true');
      await expect(list.children).toHaveLength(2);
    }
  },
});
