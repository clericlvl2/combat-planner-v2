import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { base, roles } from '../../theme.ts';
import { StateGrid } from '../../storybook/StateGrid.tsx';
import { storyT } from '../../storybook/storyT.ts';
import { RoleBlock } from './RoleBlock.tsx';
import type { RoleBlockProps, UnitRole } from './RoleBlock.tsx';

const meta = preview.meta({
  title: 'Atoms/RoleBlock',
  component: RoleBlock,
  args: { unitRole: 'enemy', top: null },
});

const rgb = (hex: string) => {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
};

const fillOf = (canvasElement: HTMLElement) => {
  const block = canvasElement.querySelector<HTMLElement>('[data-unit-role]');
  return block ? getComputedStyle(block).backgroundColor : null;
};

const states = ['default', 'editable', 'dead', 'focus', 'tap'] as const;
type State = (typeof states)[number];

const row = (label: string, unitRole: UnitRole, value: number) => ({
  label,
  render: (state: State) => (
    <RoleBlock
      unitRole={unitRole}
      top={{ kind: 'initiative', value }}
      editable={state === 'editable' || state === 'focus' || state === 'tap'}
      dead={state === 'dead'}
      onClick={state === 'editable' || state === 'focus' || state === 'tap' ? fn() : undefined}
      data-focus={state === 'focus' ? '' : undefined}
      data-tap={state === 'tap' ? '' : undefined}
    />
  ),
});

const underlineOf = (element: HTMLElement) => getComputedStyle(element).borderBottomStyle;

export const AllStates = meta.story({
  tags: ['visual'],
  render: () => (
    <StateGrid
      columns={states}
      rows={[row('Hero', 'hero', 19), row('Enemy', 'enemy', 17), row('Ally', 'ally', 9)]}
    />
  ),
});

export const OwnHero = meta.story({
  args: {
    unitRole: 'hero',
    top: { kind: 'initiative', value: 15 },
    mine: true,
    editable: true,
    onClick: fn(),
  },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    const chip = canvas.getByText(t('you'));
    await expect(chip).toBeVisible();
    await expect(getComputedStyle(chip).color).toBe(rgb(roles.hero));
    await expect(getComputedStyle(chip).backgroundColor).toBe(rgb(base.surface));
    await expect(underlineOf(canvas.getByText('15'))).toBe('dashed');
  },
});

export const NoInitiativeDie = meta.story({
  tags: ['visual'],
  args: { unitRole: 'hero', top: null },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    await expect(canvas.getByRole('img', { name: t('noInitiative') })).toBeVisible();
    await expect(canvas.getByText(t('hero'))).toBeVisible();
    await expect(fillOf(canvasElement)).toBe(rgb(roles.hero));
  },
});

export const PresetRoles = meta.story({
  tags: ['visual'],
  render: () => (
    <div style={{ display: 'flex', gap: 8, height: 64 }}>
      {(['hero', 'enemy', 'ally'] as const).map((unitRole) => (
        <RoleBlock key={unitRole} fill unitRole={unitRole} top={{ kind: 'none' }} />
      ))}
    </div>
  ),
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    const blocks = [...canvasElement.querySelectorAll<HTMLElement>('[data-unit-role]')];
    await expect(blocks).toHaveLength(3);
    for (const block of blocks) {
      const unitRole = block.dataset.unitRole as 'hero' | 'enemy' | 'ally';
      await expect(getComputedStyle(block).backgroundColor).toBe(rgb(roles[unitRole]));
      await expect(block.getBoundingClientRect().width).toBe(48);
    }
    await expect(canvas.getByText(t('enemy'))).toBeVisible();
    await expect(getComputedStyle(canvas.getByText(t('enemy'))).textTransform).toBe('uppercase');
    await expect(canvas.queryByRole('img', { name: t('noInitiative') })).toBeNull();
    await expect(blocks.map((block) => block.textContent).join('')).not.toMatch(/\d/);
  },
});

export const FocusRing = meta.story({
  tags: ['!dev'],
  args: { unitRole: 'hero', top: { kind: 'initiative', value: 15 }, editable: true, onClick: fn() },
  render: (args: RoleBlockProps) => <RoleBlock {...args} data-focus="" />,
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    const button = canvas.getByRole('button', { name: `15 ${t('hero')}` });
    await expect(getComputedStyle(button).outlineWidth).toBe('2px');
  },
});

export const DisabledUnitStaysClickable = meta.story({
  tags: ['!dev'],
  args: { unitRole: 'ally', top: { kind: 'initiative', value: 8 }, disabled: true, onClick: fn() },
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    await expect(fillOf(canvasElement)).toBe(rgb(roles.inactive));
    await userEvent.click(canvas.getByRole('button', { name: `8 ${t('ally')}` }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const NegativeInitiativeUsesMinus = meta.story({
  tags: ['!dev'],
  args: { unitRole: 'enemy', top: { kind: 'initiative', value: -9 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('−9')).toBeVisible();
  },
});

export const ClickFiresOnce = meta.story({
  tags: ['!dev'],
  args: {
    unitRole: 'enemy',
    top: { kind: 'initiative', value: 17 },
    editable: true,
    onClick: fn(),
  },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    await userEvent.click(canvas.getByRole('button', { name: `17 ${t('enemy')}` }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const EnterAndSpaceActivate = meta.story({
  tags: ['!dev'],
  args: { unitRole: 'hero', top: { kind: 'initiative', value: 15 }, editable: true, onClick: fn() },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    const button = canvas.getByRole('button', { name: `15 ${t('hero')}` });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('[Space]');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const FillTakesRowHeight = meta.story({
  tags: ['!dev'],
  args: { unitRole: 'enemy', top: { kind: 'initiative', value: 17 }, fill: true },
  render: (args: RoleBlockProps) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        height: 64,
        width: 300,
        background: 'var(--cp-color-surface)',
      }}
    >
      <RoleBlock {...args} />
      <RoleBlock {...args} fill={false} data-testid="intrinsic" />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const filled = canvasElement.querySelector<HTMLElement>('[data-fill]');
    await expect(filled?.getBoundingClientRect().height).toBe(64);
    await expect(filled?.getBoundingClientRect().width).toBe(48);
    await expect(getComputedStyle(filled as HTMLElement).borderTopLeftRadius).toBe('0px');
    await expect(canvas.getByTestId('intrinsic').getBoundingClientRect().height).toBeLessThan(64);
  },
});
