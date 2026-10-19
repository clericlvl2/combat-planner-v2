import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { EscalationDie } from './EscalationDie.tsx';
import type { EscalationDieProps } from './EscalationDie.tsx';

const meta = preview.meta({
  title: 'Atoms/EscalationDie',
  component: EscalationDie,
  args: { value: 0 },
});

const renderTap = (args: EscalationDieProps) => <EscalationDie {...args} data-tap="" />;

const tileOf = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLElement>('[data-tile]');

const pipCount = (canvasElement: HTMLElement) =>
  canvasElement.querySelectorAll('[data-pip]').length;

const tileFill = (canvasElement: HTMLElement) => {
  const tile = tileOf(canvasElement);
  return tile ? getComputedStyle(tile).backgroundColor : null;
};

const inkFill = 'rgb(35, 31, 28)';

export const Anatomy = meta.story({
  args: { value: 2 },
});

export const VariantsStates0 = meta.story({
  name: '0',
  args: { value: 0 },
  play: async ({ canvas, canvasElement }) => {
    const caption = canvas.getByText('No escalation');
    await expect(caption).toBeVisible();
    await expect(getComputedStyle(caption).color).toBe('rgb(95, 87, 77)');
    await expect(pipCount(canvasElement)).toBe(0);
    const tile = tileOf(canvasElement);
    await expect(tile && getComputedStyle(tile).borderTopStyle).toBe('dashed');
    await expect(tile && getComputedStyle(tile).borderTopColor).toBe('rgb(140, 133, 120)');
    await expect(tile && getComputedStyle(tile).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  },
});

export const VariantsStates1 = meta.story({
  name: '1',
  args: { value: 1 },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Escalation 1')).toBeVisible();
    await expect(pipCount(canvasElement)).toBe(1);
    await expect(tileFill(canvasElement)).toBe(inkFill);
  },
});

export const VariantsStates2 = meta.story({
  name: '2',
  args: { value: 2 },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Escalation 2')).toBeVisible();
    await expect(pipCount(canvasElement)).toBe(2);
    await expect(tileFill(canvasElement)).toBe(inkFill);
  },
});

export const VariantsStates3 = meta.story({
  name: '3',
  args: { value: 3 },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Escalation 3')).toBeVisible();
    await expect(pipCount(canvasElement)).toBe(3);
    await expect(tileFill(canvasElement)).toBe(inkFill);
  },
});

export const VariantsStates4 = meta.story({
  name: '4',
  args: { value: 4 },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Escalation 4')).toBeVisible();
    await expect(pipCount(canvasElement)).toBe(4);
    await expect(tileFill(canvasElement)).toBe(inkFill);
  },
});

export const VariantsStates5 = meta.story({
  name: '5',
  args: { value: 5 },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Escalation 5')).toBeVisible();
    await expect(pipCount(canvasElement)).toBe(5);
    await expect(tileFill(canvasElement)).toBe(inkFill);
  },
});

export const VariantsStates6 = meta.story({
  name: '6',
  args: { value: 6 },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Escalation 6')).toBeVisible();
    await expect(pipCount(canvasElement)).toBe(6);
    await expect(tileFill(canvasElement)).toBe(inkFill);
  },
});

export const TapDM = meta.story({
  name: 'Tap (DM)',
  args: { value: 2, onClick: fn() },
  render: renderTap,
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('button', { name: 'Escalation 2' })).toBeVisible();
    const tile = tileOf(canvasElement);
    await expect(tile && getComputedStyle(tile).outlineColor).toBe('rgb(255, 231, 163)');
    await expect(tile && getComputedStyle(tile).outlineWidth).toBe('3px');
  },
});

export const ExtraClick = meta.story({
  name: 'DM taps the die',
  args: { value: 3, onClick: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Escalation 3' }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter and Space',
  args: { value: 1, onClick: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Escalation 1' });
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
  args: { value: 2, onClick: fn() },
  render: (args: EscalationDieProps) => <EscalationDie {...args} data-focus="" />,
  play: async ({ canvasElement }) => {
    const tile = tileOf(canvasElement);
    await expect(tile && getComputedStyle(tile).outlineColor).toBe('rgb(30, 95, 168)');
  },
});

export const ExtraReadOnly = meta.story({
  name: 'Player view: read only',
  args: { value: 4, readOnly: true, onClick: fn() },
  play: async ({ args, canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
    await userEvent.click(canvas.getByText('Escalation 4'));
    await expect(args.onClick).not.toHaveBeenCalled();
  },
});

export const ExtraLocaleDe = meta.story({
  name: 'Locale de',
  globals: { locale: 'de' },
  args: { value: 2 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Eskalation 2')).toBeVisible();
  },
});

export const ExtraLocaleEs = meta.story({
  name: 'Locale es',
  globals: { locale: 'es' },
  args: { value: 2 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Escalada 2')).toBeVisible();
  },
});

export const ExtraLocaleFr = meta.story({
  name: 'Locale fr',
  globals: { locale: 'fr' },
  args: { value: 0 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Aucune escalade')).toBeVisible();
  },
});

export const ExtraLocaleJa = meta.story({
  name: 'Locale ja',
  globals: { locale: 'ja' },
  args: { value: 6 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('エスカレーション6')).toBeVisible();
  },
});

export const ExtraLocaleRu = meta.story({
  name: 'Locale ru',
  globals: { locale: 'ru' },
  args: { value: 0 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Нет эскалации')).toBeVisible();
  },
});
