import { healthSegments, healthStatus } from '@combat-planner/domain';
import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import { expect, fn, userEvent } from 'storybook/test';
import { base, health, healthTints, hpActions } from '../../theme.ts';
import { HpBox } from './HpBox.tsx';
import type { HpBoxProps } from './HpBox.tsx';
import { storyT } from '../../storybook/storyT.ts';

function HpBoxCell(props: HpBoxProps) {
  return (
    <div style={{ display: 'flex', padding: 12 }}>
      <HpBox {...props} />
    </div>
  );
}

const meta = preview.meta({
  title: 'Molecules/HpBox',
  component: HpBoxCell,
  args: { viewer: 'dm', hp: 40, maxHp: 40 },
});

const renderTap = (args: HpBoxProps) => <HpBoxCell {...args} data-tap="" />;

const rgb = (hex: string) => {
  const channel = (start: number) => Number.parseInt(hex.slice(start, start + 2), 16);
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
};

const boxOf = (canvasElement: HTMLElement) => {
  const box = canvasElement.querySelector<HTMLElement>('[data-viewer]');
  if (!box) throw new Error('HpBox not rendered');
  return box;
};

const minus = (value: number) => (value < 0 ? `−${Math.abs(value)}` : String(value));

const dmBoxFacts = (box: HTMLElement) => ({
  numbers: box.querySelector('[data-part="numbers"]')?.textContent ?? null,
  segments: box.querySelectorAll('[data-segment][data-filled]').length,
  status: box.querySelector('[data-part="status"]')?.textContent ?? null,
});

const dmBoxExpected = (t: TFunction, hp: number, maxHp: number) => {
  const status = healthStatus(hp, maxHp);
  return {
    numbers: `${minus(hp)}/${maxHp}`,
    segments: healthSegments(status, hp, maxHp),
    status: status === 'full' ? null : t(status),
  };
};

export const Anatomy = meta.story({
  args: { viewer: 'dm', hp: 14, maxHp: 40, tempHp: 5 },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(t, 14, 40));
    await expect(canvas.getByText(t('temp', { amount: 5 }))).toBeVisible();
    const box = boxOf(canvasElement);
    await expect(box.getBoundingClientRect().width).toBe(96);
    await expect(getComputedStyle(box).borderTopColor).toBe(rgb(base.border));
    await expect(getComputedStyle(canvas.getByText(t('staggered'))).color).toBe(
      rgb(health.staggered),
    );
  },
});

export const VariantsDMFull = meta.story({
  name: 'DM · Full',
  args: { viewer: 'dm', hp: 40, maxHp: 40 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(t, 40, 40));
  },
});

export const VariantsDMWounded = meta.story({
  name: 'DM · Wounded',
  args: { viewer: 'dm', hp: 24, maxHp: 40 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(t, 24, 40));
  },
});

export const Staggered = meta.story({
  name: 'Staggered',
  args: { viewer: 'dm', hp: 14, maxHp: 40 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(t, 14, 40));
  },
});

export const StaggeredLow = meta.story({
  name: 'Staggered, low',
  args: { viewer: 'dm', hp: 6, maxHp: 40 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(t, 6, 40));
  },
});

export const Dead = meta.story({
  name: 'Dead',
  args: { viewer: 'dm', hp: -3, maxHp: 18 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(t, -3, 18));
    await expect(getComputedStyle(boxOf(canvasElement)).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  },
});

export const Temp = meta.story({
  name: 'Temp',
  args: { viewer: 'dm', hp: 30, maxHp: 30, tempHp: 5 },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(t, 30, 30));
    await expect(getComputedStyle(canvas.getByText(t('temp', { amount: 5 }))).color).toBe(
      rgb(base.ink),
    );
  },
});

export const Disabled = meta.story({
  name: 'Disabled',
  args: { viewer: 'dm', hp: 18, maxHp: 18, disabled: true },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(t, 18, 18));
    await expect(getComputedStyle(boxOf(canvasElement)).borderTopColor).toBe('rgba(0, 0, 0, 0)');
    await expect(getComputedStyle(canvas.getByText('18')).color).toBe(rgb(base.secondary));
  },
});

export const Tap = meta.story({
  name: 'Tap',
  args: { viewer: 'dm', hp: 14, maxHp: 40 },
  render: renderTap,
});

export const VariantsPlayerFull = meta.story({
  name: 'Player · Full',
  args: { viewer: 'player', hp: 52, maxHp: 52 },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(canvas.getByText(t('full'))).toBeVisible();
    await expect(canvasElement.querySelectorAll('[data-segment]')).toHaveLength(0);
    await expect(getComputedStyle(boxOf(canvasElement)).backgroundColor).toBe(
      rgb(healthTints.full),
    );
  },
});

export const VariantsPlayerWounded = meta.story({
  name: 'Player · Wounded',
  args: { viewer: 'player', hp: 24, maxHp: 40 },
  play: async ({ canvasElement }) => {
    await expect(getComputedStyle(boxOf(canvasElement)).backgroundColor).toBe(
      rgb(healthTints.wounded),
    );
  },
});

export const OwnStaggered = meta.story({
  name: 'Own, Staggered',
  args: { viewer: 'player', hp: 13, maxHp: 36, mine: true },
  play: async ({ canvasElement }) => {
    const numbers = boxOf(canvasElement).firstElementChild;
    await expect(numbers && getComputedStyle(numbers).borderBottomStyle).toBe('dashed');
    await expect(getComputedStyle(boxOf(canvasElement)).backgroundColor).toBe(
      rgb(healthTints.staggered),
    );
  },
});

export const OwnTemp = meta.story({
  name: 'Own, temp',
  args: { viewer: 'player', hp: 20, maxHp: 36, tempHp: 5, mine: true },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(getComputedStyle(canvas.getByText(t('temp', { amount: 5 }))).color).toBe(
      rgb(hpActions.setTemp),
    );
  },
});

export const Enemy = meta.story({
  name: 'Enemy',
  args: { viewer: 'player', status: 'staggered', hp: undefined, maxHp: undefined },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(canvas.getByText(t('staggered'))).toBeVisible();
    await expect(boxOf(canvasElement)).toHaveTextContent(new RegExp(`^${t('staggered')}$`));
  },
});

export const EnemyDead = meta.story({
  name: 'Enemy, dead',
  args: { viewer: 'player', status: 'dead', hp: undefined, maxHp: undefined },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    const box = boxOf(canvasElement);
    await expect(box).toHaveTextContent(new RegExp(`^${t('dead')}$`));
    await expect(getComputedStyle(box).backgroundColor).toBe(rgb(base.soft));
  },
});

export const EdgeCasesThreeDigits287320 = meta.story({
  name: '287/320',
  args: { viewer: 'dm', hp: 287, maxHp: 320 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(t, 287, 320));
  },
});

export const EdgeCasesThreeDigits112320Temp = meta.story({
  name: '112/320 + temp',
  args: { viewer: 'dm', hp: 112, maxHp: 320, tempHp: 120 },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(t, 112, 320));
    await expect(canvas.getByText(t('temp', { amount: 120 }))).toBeVisible();
  },
});

export const EdgeCasesThreeDigits9999992 = meta.story({
  name: '−999/999',
  args: { viewer: 'dm', hp: -999, maxHp: 999 },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(t, -999, 999));
    await expect(canvas.getByText('−999')).toBeVisible();
  },
});

export const EdgeCasesThreeDigits999999 = meta.story({
  name: '999/999',
  args: { viewer: 'dm', hp: 999, maxHp: 999 },
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(t, 999, 999));
  },
});

export const EdgeCasesThreeDigits105320 = meta.story({
  name: '−105/320',
  args: { viewer: 'dm', hp: -105, maxHp: 320 },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(t, -105, 320));
    await expect(canvas.getByText('−105')).toBeVisible();
  },
});

export const Player187240 = meta.story({
  name: 'Player 187/240',
  args: { viewer: 'player', hp: 187, maxHp: 240, tempHp: 120 },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(canvas.getByText(t('wounded'))).toBeVisible();
    await expect(canvas.getByText(t('temp', { amount: 120 }))).toBeVisible();
  },
});

export const PlayerOwn287320 = meta.story({
  name: 'Player own 287/320',
  args: { viewer: 'player', hp: 287, maxHp: 320, mine: true },
});

const staggeredWithTemp = { viewer: 'dm', hp: 112, maxHp: 320, tempHp: 5 } as const;

export const DeStaggered = meta.story({
  name: 'de · Staggered',
  globals: { locale: 'de' },
  args: staggeredWithTemp,
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(canvas.getByText('Taumelnd')).toBeVisible();
    await expect(canvas.getByText(t('temp', { amount: 5 }))).toBeVisible();
  },
});

export const EsStaggered = meta.story({
  name: 'es · Staggered',
  globals: { locale: 'es' },
  args: staggeredWithTemp,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Tambaleante')).toBeVisible();
    await expect(canvas.getByText('+5 temp.')).toBeVisible();
  },
});

export const FrStaggered = meta.story({
  name: 'fr · Staggered',
  globals: { locale: 'fr' },
  args: staggeredWithTemp,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Chancelant')).toBeVisible();
    await expect(canvas.getByText('+5 temp.')).toBeVisible();
  },
});

export const JaStaggered = meta.story({
  name: 'ja · Staggered',
  globals: { locale: 'ja' },
  args: staggeredWithTemp,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('よろめき')).toBeVisible();
    await expect(canvas.getByText('+5一時')).toBeVisible();
  },
});

export const RuStaggered = meta.story({
  name: 'ru · Staggered',
  globals: { locale: 'ru' },
  args: staggeredWithTemp,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Шатается')).toBeVisible();
    await expect(canvas.getByText('+5 врем.')).toBeVisible();
  },
});

export const PlayerFr = meta.story({
  name: 'Player fr',
  globals: { locale: 'fr' },
  args: { viewer: 'player', hp: 112, maxHp: 320 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Chancelant')).toBeVisible();
  },
});

export const PlayerRu = meta.story({
  name: 'Player ru',
  globals: { locale: 'ru' },
  args: { viewer: 'player', hp: 112, maxHp: 320 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Шатается')).toBeVisible();
  },
});

export const ExtraClick = meta.story({
  name: 'Click opens the calculator',
  args: { viewer: 'dm', hp: 14, maxHp: 40, onClick: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: Enter and Space',
  args: { viewer: 'dm', hp: 14, maxHp: 40, onClick: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button');
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await userEvent.keyboard('[Space]');
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
});

export const ExtraReadOnly = meta.story({
  name: 'Read-only enemy for a player',
  args: { viewer: 'player', status: 'wounded', hp: undefined, maxHp: undefined, onClick: fn() },
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    await expect(canvas.queryByRole('button')).toBeNull();
    await userEvent.click(boxOf(canvasElement));
    await expect(args.onClick).not.toHaveBeenCalled();
    await expect(canvas.getByText(t('wounded'))).toBeVisible();
  },
});

export const ExtraDisabledStillOpens = meta.story({
  name: 'Disabled unit still opens the calculator',
  args: { viewer: 'dm', hp: 18, maxHp: 18, disabled: true, onClick: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
});

export const ExtraDamageSteps = meta.story({
  name: 'Damage steps 40 → −3',
  args: { viewer: 'dm', hp: 40, maxHp: 40 },
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 12 }}>
      {[40, 24, 14, 6, -3].map((hp) => (
        <div key={hp} data-step={hp}>
          <HpBox viewer="dm" hp={hp} maxHp={40} />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement, globals }) => {
    const t = storyT(globals, 'HpBox');
    for (const hp of [40, 24, 14, 6, -3]) {
      const step = canvasElement.querySelector<HTMLElement>(`[data-step="${hp}"]`);
      if (!step) throw new Error(`step ${hp} not rendered`);
      await expect(dmBoxFacts(boxOf(step))).toEqual(dmBoxExpected(t, hp, 40));
    }
  },
});
