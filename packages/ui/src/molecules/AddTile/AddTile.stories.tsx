import preview from '#.storybook/preview';
import { LIMITS } from '@combat-planner/domain';
import { IconUserPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { AddTile } from './AddTile.tsx';
import type { AddTileProps } from './AddTile.tsx';

const stage = { width: 296, maxWidth: '100%' } as const;

type AddTileCellProps = Omit<AddTileProps, 'label' | 'icon' | 'hint'> & { capped?: boolean };

function AddTileCell({ capped = false, ...props }: AddTileCellProps) {
  const { t } = useTranslation('EmptyState');
  return (
    <div style={stage}>
      <AddTile
        {...props}
        label={t('addUnit')}
        icon={IconUserPlus}
        disabled={capped || props.disabled}
        hint={capped ? t('unitCap', { ns: 'Toast', limit: LIMITS.unitsPerCombat }) : undefined}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Molecules/AddTile',
  component: AddTileCell,
  args: { onClick: fn() },
});

const states = ['Rest', 'Pressed', 'Focus', 'Disabled with hint'] as const;
type State = (typeof states)[number];

export const AllStates = meta.story({
  tags: ['visual'],
  render: (args) => (
    <StateGrid
      columns={states}
      rows={[
        {
          label: 'Tile',
          render: (state: State) => (
            <AddTileCell
              onClick={args.onClick}
              data-pressed={state === 'Pressed' ? '' : undefined}
              data-focus={state === 'Focus' ? '' : undefined}
              capped={state === 'Disabled with hint'}
            />
          ),
        },
      ]}
    />
  ),
});

export const ClickCallsOnClick = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'EmptyState');
    await userEvent.click(canvas.getByRole('button', { name: t('addUnit') }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const DisabledIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { capped: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'EmptyState');
    const tile = canvas.getByRole('button', { name: t('addUnit') });
    await expect(tile).toBeDisabled();
    await expect(tile).toHaveAccessibleDescription(
      storyT(globals, 'Toast')('unitCap', { limit: LIMITS.unitsPerCombat }),
    );
    await userEvent.click(tile, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});
