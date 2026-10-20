import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { base, interaction, roles } from '../../theme.ts';
import { RoleBlock } from './RoleBlock.tsx';
import type { RoleBlockProps } from './RoleBlock.tsx';
import { storyT } from '../../storybook/storyT.ts';

const meta = preview.meta({
  title: 'Atoms/RoleBlock',
  component: RoleBlock,
  args: { unitRole: 'enemy', top: null },
});

const renderTap = (args: RoleBlockProps) => <RoleBlock {...args} data-tap="" />;

const rgb = (hex: string) => {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
};

const fillOf = (canvasElement: HTMLElement) => {
  const block = canvasElement.querySelector<HTMLElement>('[data-unit-role]');
  return block ? getComputedStyle(block).backgroundColor : null;
};

const underlineOf = (element: HTMLElement) => getComputedStyle(element).borderBottomStyle;

export const Anatomy = meta.story({
  tags: ['visual'],
  args: {
    unitRole: 'hero',
    top: { kind: 'initiative', value: 15 },
    active: true,
    editable: true,
    onClick: fn(),
  },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    await expect(canvas.getByText('15')).toBeVisible();
    await expect(canvas.getByText(t('hero'))).toBeVisible();
    await expect(fillOf(canvasElement)).toBe(rgb(roles.hero));
    const notch = canvasElement.querySelector<HTMLElement>('[data-notch]');
    await expect(notch && getComputedStyle(notch).borderLeftColor).toBe(rgb(base.accent));
  },
});

export const Enemy = meta.story({
  name: 'Enemy',
  args: { unitRole: 'enemy', top: { kind: 'initiative', value: 17 } },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    await expect(canvas.getByText('17')).toBeVisible();
    await expect(canvas.getByText(t('enemy'))).toBeVisible();
    await expect(fillOf(canvasElement)).toBe(rgb(roles.enemy));
    await expect(underlineOf(canvas.getByText('17'))).toBe('none');
  },
});

export const Hero = meta.story({
  name: 'Hero',
  args: { unitRole: 'hero', top: { kind: 'initiative', value: 19 } },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    await expect(canvas.getByText('19')).toBeVisible();
    await expect(canvas.getByText(t('hero'))).toBeVisible();
    await expect(fillOf(canvasElement)).toBe(rgb(roles.hero));
  },
});

export const Ally = meta.story({
  name: 'Ally',
  args: { unitRole: 'ally', top: { kind: 'initiative', value: 9 } },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    await expect(canvas.getByText('9')).toBeVisible();
    await expect(canvas.getByText(t('ally'))).toBeVisible();
    await expect(fillOf(canvasElement)).toBe(rgb(roles.ally));
  },
});

export const ActiveTurn = meta.story({
  name: 'Active turn',
  args: { unitRole: 'hero', top: { kind: 'initiative', value: 15 }, active: true },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    await expect(canvas.getByText('15')).toBeVisible();
    await expect(canvas.getByText(t('hero'))).toBeVisible();
    await expect(canvasElement.querySelector('[data-notch]')).not.toBeNull();
    await expect(fillOf(canvasElement)).toBe(rgb(roles.hero));
  },
});

export const DMEditable = meta.story({
  name: 'DM: editable',
  args: {
    unitRole: 'enemy',
    top: { kind: 'initiative', value: 17 },
    editable: true,
    onClick: fn(),
  },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    await expect(underlineOf(canvas.getByText('17'))).toBe('dashed');
    await expect(canvas.getByRole('button', { name: `17 ${t('enemy')}` })).toBeVisible();
    await expect(fillOf(canvasElement)).toBe(rgb(roles.enemy));
  },
});

export const Tap = meta.story({
  name: 'Tap',
  args: {
    unitRole: 'enemy',
    top: { kind: 'initiative', value: 17 },
    editable: true,
    onClick: fn(),
  },
  render: renderTap,
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    const button = canvas.getByRole('button', { name: `17 ${t('enemy')}` });
    await expect(fillOf(canvasElement)).toBe(rgb(roles.enemy));
    await expect(getComputedStyle(button).outlineColor).toBe(rgb(interaction.tapMarker));
    await expect(getComputedStyle(button).outlineWidth).toBe('3px');
  },
});

export const NoInitiativeDie = meta.story({
  tags: ['visual'],
  name: 'No initiative: die',
  args: { unitRole: 'hero', top: null },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    await expect(canvas.getByRole('img', { name: t('noInitiative') })).toBeVisible();
    await expect(canvas.getByText(t('hero'))).toBeVisible();
    await expect(fillOf(canvasElement)).toBe(rgb(roles.hero));
  },
});

export const OwnHero = meta.story({
  name: 'Own hero',
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

export const DeadDisabled = meta.story({
  name: 'Dead / disabled',
  args: { unitRole: 'enemy', top: { kind: 'initiative', value: 12 }, dead: true },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    await expect(canvas.getByText(t('enemy'))).toBeVisible();
    await expect(fillOf(canvasElement)).toBe(rgb(roles.inactive));
  },
});

export const PresetHP = meta.story({
  name: 'Preset: HP',
  args: { unitRole: 'enemy', top: { kind: 'hp', value: 40 } },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    await expect(canvas.getByText('40')).toBeVisible();
    await expect(canvas.getByText(t('hp'))).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(fillOf(canvasElement)).toBe(rgb(roles.enemy));
  },
});

export const Preset320HP = meta.story({
  name: 'Preset: 320 HP',
  args: { unitRole: 'enemy', top: { kind: 'hp', value: 320 } },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('320')).toBeVisible();
    await expect(fillOf(canvasElement)).toBe(rgb(roles.enemy));
    const block = canvasElement.querySelector<HTMLElement>('[data-unit-role]');
    await expect(block?.getBoundingClientRect().width).toBe(62);
  },
});

export const Preset999HP = meta.story({
  tags: ['visual'],
  name: 'Preset: 999 HP',
  args: { unitRole: 'enemy', top: { kind: 'hp', value: 999 } },
  play: async ({ canvas, canvasElement }) => {
    const value = canvas.getByText('999');
    await expect(value).toBeVisible();
    await expect(fillOf(canvasElement)).toBe(rgb(roles.enemy));
    const block = canvasElement.querySelector<HTMLElement>('[data-unit-role]');
    await expect(block?.getBoundingClientRect().width).toBe(62);
    await expect(value.getBoundingClientRect().width).toBeLessThanOrEqual(58);
  },
});

export const ExtraDisabledUnit = meta.story({
  name: 'Disabled unit',
  args: { unitRole: 'ally', top: { kind: 'initiative', value: 8 }, disabled: true, onClick: fn() },
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    await expect(fillOf(canvasElement)).toBe(rgb(roles.inactive));
    await userEvent.click(canvas.getByRole('button', { name: `8 ${t('ally')}` }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const ExtraNegativeInitiative = meta.story({
  name: 'Negative initiative',
  args: { unitRole: 'enemy', top: { kind: 'initiative', value: -9 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('−9')).toBeVisible();
  },
});

export const ExtraClick = meta.story({
  name: 'DM taps the block',
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

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter and Space',
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

export const ExtraFocus = meta.story({
  name: 'Focus',
  args: { unitRole: 'hero', top: { kind: 'initiative', value: 15 }, editable: true, onClick: fn() },
  render: (args: RoleBlockProps) => <RoleBlock {...args} data-focus="" />,
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'RoleBlock');
    const button = canvas.getByRole('button', { name: `15 ${t('hero')}` });
    await expect(getComputedStyle(button).outlineWidth).toBe('2px');
  },
});

export const ExtraFill = meta.story({
  name: 'fill takes the row height',
  args: { unitRole: 'enemy', top: { kind: 'initiative', value: 17 }, fill: true },
  render: (args: RoleBlockProps) => (
    <div style={{ display: 'flex', height: 64, width: 300, background: 'var(--cp-color-surface)' }}>
      <RoleBlock {...args} />
      <RoleBlock {...args} fill={false} data-testid="intrinsic" />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const filled = canvasElement.querySelector<HTMLElement>('[data-fill]');
    await expect(filled?.getBoundingClientRect().height).toBe(64);
    await expect(canvas.getByTestId('intrinsic').getBoundingClientRect().height).toBe(80);
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { unitRole: 'ally', top: { kind: 'initiative', value: 9 }, mine: true },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Verbündeter')).toBeVisible();
    await expect(canvas.getByText('Du')).toBeVisible();
    const block = canvasElement.querySelector<HTMLElement>('[data-unit-role]');
    await expect(block?.getBoundingClientRect().width).toBe(62);
  },
});

export const ExtraLocaleEs = meta.story({
  name: 'Locale es',
  globals: { locale: 'es' },
  args: { unitRole: 'enemy', top: { kind: 'hp', value: 40 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('PG')).toBeVisible();
  },
});

export const ExtraLocaleFr = meta.story({
  name: 'Locale fr',
  globals: { locale: 'fr' },
  args: { unitRole: 'hero', top: { kind: 'initiative', value: 15 }, mine: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Héros')).toBeVisible();
    await expect(canvas.getByText('Vous')).toBeVisible();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { unitRole: 'hero', top: { kind: 'initiative', value: 15 }, mine: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('ヒーロー')).toBeVisible();
    await expect(canvas.getByText('あなた')).toBeVisible();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { unitRole: 'ally', top: { kind: 'initiative', value: 9 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Союзник')).toBeVisible();
  },
});
