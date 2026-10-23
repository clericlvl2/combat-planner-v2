import preview from '#.storybook/preview';
import { IconChevronLeft, IconMenu2, IconPlus, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/IconButton.json';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { IconButton } from './IconButton.tsx';
import type { IconButtonProps } from './IconButton.tsx';

type LabelKey = keyof typeof en;

interface IconButtonCellProps extends Omit<IconButtonProps, 'aria-label'> {
  labelKey: LabelKey;
}

function IconButtonCell({ labelKey, ...props }: IconButtonCellProps) {
  const { t } = useTranslation('IconButton');
  return <IconButton {...props} aria-label={t(labelKey)} />;
}

const meta = preview.meta({
  title: 'Atoms/IconButton',
  component: IconButtonCell,
  args: { onClick: fn() },
});

const outlineX = { variant: 'outline', icon: IconX, labelKey: 'close' } as const;
const plainMenu = { variant: 'plain', icon: IconMenu2, labelKey: 'openNavigation' } as const;
const softBack = { variant: 'soft', icon: IconChevronLeft, labelKey: 'back' } as const;
const filledPlus = { variant: 'filled', icon: IconPlus, labelKey: 'add' } as const;

const states = ['default', 'pressed', 'disabled', 'focus', 'loading'] as const;
type State = (typeof states)[number];

const row = (label: string, props: IconButtonCellProps) => ({
  label,
  render: (state: State) => (
    <IconButtonCell
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
  args: outlineX,
  render: () => (
    <StateGrid
      columns={states}
      rows={[
        row('Outline M', { ...outlineX, size: 'M' }),
        row('Plain M', { ...plainMenu, size: 'M' }),
        row('Soft M', { ...softBack, size: 'M' }),
        row('Filled M', { ...filledPlus, size: 'M' }),
        row('Outline S', { ...outlineX, size: 'S' }),
        row('Outline L', { ...outlineX, size: 'L' }),
      ]}
    />
  ),
});

export const OpenState = meta.story({
  args: { ...plainMenu, size: 'M' },
  render: (args) => (
    <div style={{ display: 'flex', gap: 16 }}>
      <IconButtonCell {...args} {...outlineX} data-open="" />
      <IconButtonCell {...args} data-open="" />
      <IconButtonCell {...args} {...softBack} data-open="" />
      <IconButtonCell {...args} {...filledPlus} data-open="" />
    </div>
  ),
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'IconButton');
    for (const name of [t('openNavigation'), t('back'), t('add')]) {
      const button = canvas.getByRole('button', { name });
      await expect(getComputedStyle(button).boxShadow).toBe(
        'rgb(35, 31, 28) 0px 0px 0px 2px inset',
      );
      await expect(getComputedStyle(button).backgroundColor).toBe('rgb(255, 231, 163)');
      await expect(getComputedStyle(button).color).toBe('rgb(35, 31, 28)');
    }
  },
});

export const OpenColours = meta.story({
  tags: ['!dev'],
  args: { ...outlineX, size: 'M' },
  render: (args) => <IconButtonCell {...args} data-open="" />,
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'IconButton');
    const button = canvas.getByRole('button', { name: t('close') });
    await expect(button).toHaveAttribute('data-open');
    await expect(getComputedStyle(button).backgroundColor).toBe('rgb(255, 231, 163)');
    await expect(getComputedStyle(button).borderTopColor).toBe('rgb(35, 31, 28)');
  },
});

export const DisabledIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { ...outlineX, disabled: true, onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'IconButton');
    const button = canvas.getByRole('button', { name: t('close') });
    await expect(button).toBeDisabled();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});

export const ClickFiresOnce = meta.story({
  tags: ['!dev'],
  args: { ...outlineX, onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'IconButton');
    await userEvent.click(canvas.getByRole('button', { name: t('close') }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const EnterAndSpaceActivate = meta.story({
  tags: ['!dev'],
  args: { ...plainMenu, onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'IconButton');
    const button = canvas.getByRole('button', { name: t('openNavigation') });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('[Space]');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const CircleAndIconSizes = meta.story({
  tags: ['!dev'],
  args: plainMenu,
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <IconButtonCell {...args} size="S" />
      <IconButtonCell {...args} size="M" />
      <IconButtonCell {...args} size="L" />
    </div>
  ),
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'IconButton');
    const buttons = canvas.getAllByRole('button', { name: t('openNavigation') });
    const circles = buttons.map((button) => button.getBoundingClientRect().width);
    const icons = buttons.map((button) => button.querySelector('svg')?.getAttribute('width'));
    await expect(circles).toEqual([36, 44, 52]);
    await expect(icons).toEqual(['16', '24', '24']);
  },
});
