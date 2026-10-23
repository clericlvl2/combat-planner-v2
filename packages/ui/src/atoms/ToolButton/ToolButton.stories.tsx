import preview from '#.storybook/preview';
import { IconSortDescending, IconTags } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/ToolButton.json';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { ToolButton } from './ToolButton.tsx';
import type { ToolButtonProps } from './ToolButton.tsx';

type LabelKey = keyof typeof en;

interface ToolButtonCellProps extends Omit<ToolButtonProps, 'label' | 'aria-label'> {
  labelKey?: LabelKey;
  ariaKey?: LabelKey;
}

function ToolButtonCell({ labelKey, ariaKey, ...props }: ToolButtonCellProps) {
  const { t } = useTranslation('ToolButton');
  return (
    <ToolButton
      {...props}
      label={labelKey ? t(labelKey) : undefined}
      aria-label={ariaKey ? t(ariaKey) : undefined}
    />
  );
}

const meta = preview.meta({
  title: 'Atoms/ToolButton',
  component: ToolButtonCell,
  args: { onClick: fn() },
});

const sortDefault = { icon: IconSortDescending, ariaKey: 'sort' } as const;
const sortActive = { icon: IconSortDescending, labelKey: 'lastPlayed', active: true } as const;
const tagsDefault = { icon: IconTags, labelKey: 'tags' } as const;
const tagsActiveCount = { icon: IconTags, labelKey: 'tags', count: 2, active: true } as const;
const tagsIconCount = { icon: IconTags, ariaKey: 'tags', count: 2, active: true } as const;

const states = ['default', 'pressed', 'disabled', 'focus', 'loading'] as const;
type State = (typeof states)[number];

const row = (label: string, props: ToolButtonCellProps) => ({
  label,
  render: (state: State) => (
    <ToolButtonCell
      {...props}
      data-pressed={state === 'pressed' ? '' : undefined}
      data-focus={state === 'focus' ? '' : undefined}
      disabled={state === 'disabled'}
      loading={state === 'loading'}
    />
  ),
});

export const AllStates = meta.story({
  tags: ['visual'],
  args: sortDefault,
  render: () => (
    <StateGrid
      columns={states}
      rows={[
        row('Icon S', { ...sortDefault, size: 'S' }),
        row('Icon M', { ...sortDefault, size: 'M' }),
        row('Icon L', { ...sortDefault, size: 'L' }),
        row('Label', tagsDefault),
        row('Active', sortActive),
        row('Active with count', tagsActiveCount),
        row('Icon with count', tagsIconCount),
      ]}
    />
  ),
});

export const LongCount = meta.story({
  tags: ['visual'],
  args: { ...tagsIconCount, count: 12 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'ToolButton');
    const button = canvas.getByRole('button', { name: t('tags') });
    const badge = canvas.getByText('12');
    await expect(button).toContainElement(badge);
    const box = button.getBoundingClientRect();
    const corner = badge.getBoundingClientRect();
    await expect(corner.top).toBeLessThan(box.top);
    await expect(corner.right).toBeGreaterThan(box.right);
  },
});

export const LabelledCountInline = meta.story({
  tags: ['!dev'],
  args: tagsActiveCount,
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'ToolButton');
    const button = canvas.getByRole('button', { name: `${t('tags')} 2` });
    const box = button.getBoundingClientRect();
    const count = canvas.getByText('2').getBoundingClientRect();
    await expect(count.top).toBeGreaterThanOrEqual(box.top);
    await expect(count.right).toBeLessThanOrEqual(box.right);
  },
});

export const DisabledIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { ...sortActive, disabled: true, onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'ToolButton');
    const button = canvas.getByRole('button', { name: t('lastPlayed') });
    await expect(button).toBeDisabled();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});

export const ClickFiresOnce = meta.story({
  tags: ['!dev'],
  args: { ...sortDefault, onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'ToolButton');
    await userEvent.click(canvas.getByRole('button', { name: t('sort') }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const EnterAndSpaceActivate = meta.story({
  tags: ['!dev'],
  args: { ...tagsActiveCount, onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'ToolButton');
    const button = canvas.getByRole('button', { name: `${t('tags')} 2` });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('[Space]');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const HeightsAndIconSizes = meta.story({
  tags: ['!dev'],
  args: sortDefault,
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <ToolButtonCell {...args} size="S" />
      <ToolButtonCell {...args} size="M" />
      <ToolButtonCell {...args} size="L" />
    </div>
  ),
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'ToolButton');
    const buttons = canvas.getAllByRole('button', { name: t('sort') });
    const heights = buttons.map((button) => button.getBoundingClientRect().height);
    const icons = buttons.map((button) => button.querySelector('svg')?.getAttribute('width'));
    await expect(heights).toEqual([40, 48, 56]);
    await expect(icons).toEqual(['16', '20', '24']);
  },
});
