import preview from '#.storybook/preview';
import { expect } from 'storybook/test';
import { Button } from '../../atoms/Button/Button.tsx';
import type { ButtonSize, ButtonVariant } from '../../atoms/Button/Button.tsx';
import { StateGrid, cellLabelOf } from '../StateGrid.tsx';

const columns = ['Default', 'Pressed', 'Focus', 'Disabled'] as const;

type ButtonState = (typeof columns)[number];

const buttons: readonly { variant: ButtonVariant; size: ButtonSize }[] = [
  { variant: 'primary', size: 'S' },
  { variant: 'primary', size: 'M' },
  { variant: 'primary', size: 'L' },
  { variant: 'secondary', size: 'M' },
  { variant: 'danger', size: 'M' },
  { variant: 'ghost', size: 'S' },
  { variant: 'ghost', size: 'M' },
];

const rows = buttons.map(({ variant, size }) => ({
  label: `${variant} ${size}`,
  render: (state: ButtonState) => (
    <Button
      variant={variant}
      size={size}
      disabled={state === 'Disabled'}
      data-pressed={state === 'Pressed' ? '' : undefined}
      data-focus={state === 'Focus' ? '' : undefined}
    >
      Новый бой
    </Button>
  ),
}));

const meta = preview.meta({
  title: 'Storybook/StateGridProbe',
  tags: ['!dev', '!autodocs'],
  render: () => <StateGrid rows={rows} columns={columns} />,
});

export const ButtonGridFitsThePhone = meta.story({
  play: async ({ canvas }) => {
    const labels = rows.flatMap((row) => columns.map((column) => cellLabelOf(row.label, column)));
    await expect(labels).toHaveLength(28);
    for (const label of labels) {
      await expect(canvas.getByText(label)).toBeVisible();
    }
  },
});
