import preview from '#.storybook/preview';
import { expect, waitFor } from 'storybook/test';
import { ScrollList } from './ScrollList.tsx';

interface ScrollListSampleProps {
  rows: number;
}

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  height: 56,
  padding: '0 12px',
  border: '2px solid var(--cp-color-border)',
  borderRadius: 16,
  background: 'var(--cp-color-surface)',
  fontFamily: 'var(--cp-font-ui)',
  fontVariantNumeric: 'tabular-nums',
} as const;

function ScrollListSample({ rows }: ScrollListSampleProps) {
  return (
    <div style={{ display: 'flex', height: 320, background: 'var(--cp-color-background)' }}>
      <ScrollList style={{ flex: 1 }} viewportProps={{ 'data-testid': 'viewport' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 12px' }}>
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} style={rowStyle}>
              {index + 1}
            </div>
          ))}
        </div>
      </ScrollList>
    </div>
  );
}

const meta = preview.meta({
  title: 'Molecules/ScrollList',
  component: ScrollListSample,
  args: { rows: 12 },
});

export const Default = meta.story({ tags: ['visual'] });

const shadowOpacity = (area: Element, edge: '::before' | '::after') =>
  getComputedStyle(area, edge).opacity;

export const EdgeShadowsFollowScroll = meta.story({
  tags: ['!dev'],
  play: async ({ canvas }) => {
    const viewport = canvas.getByTestId('viewport');
    const area = viewport.closest('[data-scroll-list]');
    if (!area) throw new Error('The scroll area is missing');
    const range = viewport.scrollHeight - viewport.clientHeight;
    await expect(range).toBeGreaterThan(0);

    await waitFor(() => expect(area).toHaveAttribute('data-scroll-down'));
    await expect(area).not.toHaveAttribute('data-scroll-up');
    await expect(shadowOpacity(area, '::before')).toBe('0');
    await expect(shadowOpacity(area, '::after')).toBe('1');

    viewport.scrollTop = range / 2;
    await waitFor(() => expect(area).toHaveAttribute('data-scroll-up'));
    await expect(area).toHaveAttribute('data-scroll-down');
    await expect(shadowOpacity(area, '::before')).toBe('1');
    await expect(shadowOpacity(area, '::after')).toBe('1');

    viewport.scrollTop = range;
    await waitFor(() => expect(area).not.toHaveAttribute('data-scroll-down'));
    await expect(area).toHaveAttribute('data-scroll-up');
    await expect(shadowOpacity(area, '::before')).toBe('1');
    await expect(shadowOpacity(area, '::after')).toBe('0');
  },
});

export const ShortContentHasNoShadows = meta.story({
  tags: ['!dev'],
  args: { rows: 2 },
  play: async ({ canvas }) => {
    const viewport = canvas.getByTestId('viewport');
    const area = viewport.closest('[data-scroll-list]');
    await expect(viewport.scrollHeight).toBe(viewport.clientHeight);
    await expect(area).not.toHaveAttribute('data-scroll-up');
    await expect(area).not.toHaveAttribute('data-scroll-down');
  },
});
