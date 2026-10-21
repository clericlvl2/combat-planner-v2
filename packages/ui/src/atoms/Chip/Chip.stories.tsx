import preview from '#.storybook/preview';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { expect, fn, userEvent } from 'storybook/test';
import type en from '../../i18n/en/Chip.json';
import { base, conditionNames, conditions } from '../../theme.ts';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { Chip } from './Chip.tsx';
import type { ChipProps } from './Chip.tsx';

type LabelKey = keyof typeof en;

interface ChipCellProps extends Omit<ChipProps, 'children'> {
  labelKey?: LabelKey;
}

function ChipCell({
  labelKey = 'goblins',
  selected = false,
  onClick,
  onRemove,
  ...props
}: ChipCellProps) {
  const { t } = useTranslation('Chip');
  const [isSelected, setSelected] = useState(selected);
  const text = t(labelKey);
  return (
    <Chip
      {...props}
      selected={isSelected}
      aria-label={onRemove ? t('remove', { label: text }) : undefined}
      onRemove={onRemove}
      onClick={
        onClick
          ? (event) => {
              setSelected((value) => !value);
              onClick(event);
            }
          : undefined
      }
    >
      {text}
    </Chip>
  );
}

const meta = preview.meta({
  title: 'Atoms/Chip',
  component: ChipCell,
});

const tag = () => ({ variant: 'tag', labelKey: 'goblins', onClick: fn() }) as const;
const tagActive = () =>
  ({ variant: 'tag', labelKey: 'orcs', selected: true, onRemove: fn() }) as const;
const add = () => ({ variant: 'add', labelKey: 'addTag', onClick: fn() }) as const;
const hampered = { variant: 'condition', condition: 'hampered', labelKey: 'hampered' } as const;
const statusActive = { variant: 'status', labelKey: 'active', selected: true } as const;
const metaChip = { variant: 'meta', labelKey: 'namedNpcs' } as const;

const states = ['default', 'pressed', 'disabled', 'focus'] as const;
type State = (typeof states)[number];

const row = (label: string, props: ChipCellProps, interactive: boolean) => ({
  label,
  render: (state: State) =>
    !interactive && (state === 'pressed' || state === 'focus') ? null : (
      <ChipCell
        {...props}
        data-pressed={state === 'pressed' ? '' : undefined}
        data-focus={state === 'focus' ? '' : undefined}
        disabled={state === 'disabled'}
      />
    ),
});

const allConditions = (size?: ChipProps['size']) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {conditionNames.map((name) => (
      <ChipCell key={name} variant="condition" condition={name} labelKey={name} size={size} />
    ))}
  </div>
);

const rgb = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
};

const heightOf = (element: HTMLElement) => element.getBoundingClientRect().height;

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => (
    <StateGrid
      columns={states}
      rows={[
        row('Tag L', { ...tag(), size: 'L' }, true),
        row('Tag M', { ...tag(), size: 'M' }, true),
        row('Tag S', { ...tag(), size: 'S' }, true),
        row('Active tag L', { ...tagActive(), size: 'L' }, true),
        row('Add L', { ...add(), size: 'L' }, true),
        row('Condition S', { ...hampered, size: 'S' }, false),
        row('Status S', { variant: 'status', labelKey: 'setup', size: 'S' }, false),
        row('Active status S', { ...statusActive, size: 'S' }, false),
        row('Meta S', { ...metaChip, size: 'S' }, false),
      ]}
    />
  ),
});

export const AllConditions = meta.story({
  render: () => allConditions(),
});

export const LongCount = meta.story({
  tags: ['visual'],
  args: { ...tagActive(), labelKey: 'ferry', count: 12 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Chip');
    const chip = canvas.getByRole('button', { name: t('remove', { label: t('ferry') }) });
    await expect(chip).toHaveTextContent(`${t('ferry')}12`);
    await expect(heightOf(chip)).toBe(36);
  },
});

export const HeightsBySize = meta.story({
  tags: ['!dev'],
  render: () => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <ChipCell {...tag()} size="S" />
      <ChipCell {...tag()} size="M" />
      <ChipCell {...tag()} size="L" />
    </div>
  ),
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Chip');
    const heights = canvas.getAllByRole('button', { name: t('goblins') }).map(heightOf);
    await expect(heights).toEqual([20, 28, 36]);
  },
});

export const ConditionColours = meta.story({
  tags: ['!dev'],
  render: () => allConditions('S'),
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'Chip');
    for (const name of conditionNames) {
      const chip = canvasElement.querySelector<HTMLElement>(`[data-condition='${name}']`);
      await expect(chip).not.toBeNull();
      if (!chip) continue;
      await expect(chip).toHaveTextContent(t(name));
      await expect(heightOf(chip)).toBe(20);
      await expect(getComputedStyle(chip).backgroundColor).toBe(rgb(conditions[name].fill));
      await expect(getComputedStyle(chip).color).toBe(rgb(conditions[name].text));
    }
  },
});

export const PressedKeepsStaticFills = meta.story({
  tags: ['!dev'],
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <ChipCell {...hampered} data-pressed="" />
      <ChipCell {...statusActive} data-pressed="" />
      <ChipCell {...metaChip} data-pressed="" />
    </div>
  ),
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Chip');
    const fills = [t('hampered'), t('active'), t('namedNpcs')].map(
      (text) =>
        getComputedStyle(canvas.getByText(text).closest('[data-variant]') as Element)
          .backgroundColor,
    );
    await expect(fills).toEqual([rgb(conditions.hampered.fill), rgb(base.accent), rgb(base.soft)]);
  },
});

export const DisabledIgnoresClick = meta.story({
  tags: ['!dev'],
  args: { ...tag(), disabled: true },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Chip');
    const chip = canvas.getByRole('button', { name: t('goblins') });
    await expect(chip).toBeDisabled();
    await userEvent.click(chip, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
  },
});

export const StaticVariantsAreNotButtons = meta.story({
  tags: ['!dev'],
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <ChipCell {...hampered} />
      <ChipCell variant="status" labelKey="setup" />
      <ChipCell {...statusActive} />
      <ChipCell {...metaChip} />
    </div>
  ),
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'Chip');
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
    const setup = canvas.getByText(t('setup')).parentElement as HTMLElement;
    await expect(getComputedStyle(setup).backgroundColor).toBe('rgb(243, 237, 226)');
    await expect(getComputedStyle(setup).color).toBe('rgb(95, 87, 77)');
    const active = canvas.getByText(t('active')).parentElement as HTMLElement;
    await expect(getComputedStyle(active).backgroundColor).toBe('rgb(255, 231, 163)');
  },
});

export const ClickTogglesTag = meta.story({
  tags: ['!dev'],
  args: tag(),
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Chip');
    const chip = canvas.getByRole('button', { name: t('goblins') });
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    await expect(args.onClick).toHaveBeenCalledOnce();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(chip).toHaveAttribute('data-selected');
    await expect(getComputedStyle(chip).backgroundColor).toBe('rgb(35, 31, 28)');
    await userEvent.click(chip);
    await expect(args.onClick).toHaveBeenCalledTimes(2);
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await expect(chip).not.toHaveAttribute('data-selected');
  },
});

export const EnterAndSpaceToggleTag = meta.story({
  tags: ['!dev'],
  args: tag(),
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Chip');
    const chip = canvas.getByRole('button', { name: t('goblins') });
    await userEvent.tab();
    await expect(chip).toHaveFocus();
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.keyboard('{Enter}');
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard('[Space]');
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const ClickRemovesActiveTag = meta.story({
  tags: ['!dev'],
  args: tagActive(),
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Chip');
    const chip = canvas.getByRole('button', { name: t('remove', { label: t('orcs') }) });
    await expect(chip).not.toHaveAttribute('aria-pressed');
    await userEvent.click(chip);
    await expect(args.onRemove).toHaveBeenCalledOnce();
  },
});

export const EnterAndSpaceActivate = meta.story({
  tags: ['!dev'],
  args: add(),
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'Chip');
    const chip = canvas.getByRole('button', { name: t('addTag') });
    await userEvent.tab();
    await expect(chip).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('[Space]');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const StaticChipForwardsProps = meta.story({
  tags: ['!dev'],
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Chip variant="meta" id="chip-meta" data-part="kind" aria-describedby="chip-status">
        Max
      </Chip>
      <Chip variant="status" id="chip-status" selected>
        Active
      </Chip>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const chip = canvasElement.querySelector<HTMLElement>('#chip-meta');
    await expect(chip?.tagName).toBe('SPAN');
    await expect(chip).toHaveAttribute('data-part', 'kind');
    await expect(chip).toHaveAttribute('aria-describedby', 'chip-status');
    await expect(chip).not.toHaveAttribute('data-condition');
    await expect(canvasElement.querySelector('#chip-status')).not.toHaveAttribute('data-condition');
  },
});
