import preview from '#.storybook/preview';
import { IconPlus, IconUserX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import type en from '../../i18n/en/Button.json';
import { IconDiceD20 } from '../icons/IconDiceD20.ts';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { layout } from '../../layout.ts';
import { Button } from './Button.tsx';
import type { ButtonProps } from './Button.tsx';

type LabelKey = keyof typeof en;

interface ButtonCellProps extends Omit<ButtonProps, 'children'> {
  labelKey?: LabelKey;
  caption?: string;
}

function ButtonCell({ labelKey = 'save', caption, ...props }: ButtonCellProps) {
  const { t } = useTranslation('Button');
  return <Button {...props}>{caption ?? t(labelKey)}</Button>;
}

const meta = preview.meta({
  title: 'Atoms/Button',
  component: ButtonCell,
  args: { onClick: fn() },
});

const states = ['default', 'pressed', 'disabled', 'focus', 'loading'] as const;
type State = (typeof states)[number];

const stateProps = (state: State) => ({
  'data-pressed': state === 'pressed' ? '' : undefined,
  'data-focus': state === 'focus' ? '' : undefined,
  disabled: state === 'disabled',
  loading: state === 'loading',
});

const row = (label: string, props: ButtonCellProps) => ({
  label,
  render: (state: State) => <ButtonCell {...props} {...stateProps(state)} />,
});

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => (
    <StateGrid
      columns={states}
      rows={[
        row('Primary S', { variant: 'primary', size: 'S', icon: IconDiceD20, labelKey: 'rollD20' }),
        row('Primary M', { variant: 'primary', size: 'M', labelKey: 'save' }),
        row('Primary L', { variant: 'primary', size: 'L', labelKey: 'save' }),
        row('Primary L with icon', {
          variant: 'primary',
          size: 'L',
          icon: IconPlus,
          labelKey: 'newCombat',
        }),
        row('Secondary M', { variant: 'secondary', size: 'M', labelKey: 'cancel' }),
        row('Danger M', { variant: 'danger', size: 'M', labelKey: 'delete' }),
        row('Ghost S', { variant: 'ghost', size: 'S', labelKey: 'clear' }),
        row('Primary stacked', {
          variant: 'primary',
          stacked: true,
          icon: IconDiceD20,
          caption: '+3',
        }),
      ]}
    />
  ),
});

export const FullWidthWithIcon = meta.story({
  tags: ['visual'],
  args: {
    variant: 'secondary',
    size: 'S',
    icon: IconUserX,
    labelKey: 'releaseHero',
    fullWidth: true,
  },
});

export const DisabledIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { variant: 'primary', size: 'M', labelKey: 'save', disabled: true, onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Button');
    const button = canvas.getByRole('button', { name: t('save') });
    await expect(button).toBeDisabled();
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});

export const ClickFiresOnce = meta.story({
  tags: ['!dev'],
  args: { variant: 'primary', size: 'M', labelKey: 'save', onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Button');
    await userEvent.click(canvas.getByRole('button', { name: t('save') }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const EnterAndSpaceActivate = meta.story({
  tags: ['!dev'],
  args: { variant: 'primary', size: 'M', labelKey: 'save', onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Button');
    const button = canvas.getByRole('button', { name: t('save') });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('[Space]');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const LoadingIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { variant: 'primary', size: 'M', labelKey: 'save', loading: true, onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Button');
    const button = canvas.getByRole('button', { name: t('save') });
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
    await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
    await expect(button).toBeDisabled();
  },
});

export const StackedIsSquare = meta.story({
  tags: ['!dev'],
  args: { variant: 'primary', stacked: true, icon: IconDiceD20, caption: '+3' },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: '+3' });
    const box = button.getBoundingClientRect();
    await expect([box.width, box.height]).toEqual([layout.control.M, layout.control.M]);
    const icon = button.querySelector('svg')?.getBoundingClientRect();
    const caption = canvas.getByText('+3').getBoundingClientRect();
    await expect(icon && icon.bottom <= caption.top).toBe(true);
  },
});
