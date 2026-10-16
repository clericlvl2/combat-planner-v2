import { healthSegments, healthStatus } from '@combat-planner/domain';
import preview from '#.storybook/preview';
import { expect, fn, userEvent } from 'storybook/test';
import { base, health, healthTints, hpActions } from '../../theme.ts';
import { HpBox } from './HpBox.tsx';
import type { HpBoxProps } from './HpBox.tsx';

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

const statusLabels = {
  full: 'Full',
  wounded: 'Wounded',
  bloodied: 'Bloodied',
  dead: 'Dead',
} as const;

const minus = (value: number) => (value < 0 ? `−${Math.abs(value)}` : String(value));

const dmBoxFacts = (box: HTMLElement) => ({
  numbers: box.querySelector('[data-part="numbers"]')?.textContent ?? null,
  segments: box.querySelectorAll('[data-segment][data-filled]').length,
  status: box.querySelector('[data-part="status"]')?.textContent ?? null,
});

const dmBoxExpected = (hp: number, maxHp: number) => {
  const status = healthStatus(hp, maxHp);
  return {
    numbers: `${minus(hp)}/${maxHp}`,
    segments: healthSegments(status, hp, maxHp),
    status: status === 'full' ? null : statusLabels[status],
  };
};

export const Anatomy = meta.story({
  args: { viewer: 'dm', hp: 14, maxHp: 40, tempHp: 5 },
  play: async ({ canvas, canvasElement }) => {
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(14, 40));
    await expect(canvas.getByText('+5 temp')).toBeVisible();
    const box = boxOf(canvasElement);
    await expect(box.getBoundingClientRect().width).toBe(96);
    await expect(getComputedStyle(box).borderTopColor).toBe(rgb(base.border));
    await expect(getComputedStyle(canvas.getByText('Bloodied')).color).toBe(rgb(health.bloodied));
  },
});

export const VariantsDMFull = meta.story({
  name: 'DM · Full',
  args: { viewer: 'dm', hp: 40, maxHp: 40 },
  play: async ({ canvasElement }) => {
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(40, 40));
  },
});

export const VariantsDMWounded = meta.story({
  name: 'DM · Wounded',
  args: { viewer: 'dm', hp: 24, maxHp: 40 },
  play: async ({ canvasElement }) => {
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(24, 40));
  },
});

export const Bloodied = meta.story({
  name: 'Bloodied',
  args: { viewer: 'dm', hp: 14, maxHp: 40 },
  play: async ({ canvasElement }) => {
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(14, 40));
  },
});

export const BloodiedLow = meta.story({
  name: 'Bloodied, low',
  args: { viewer: 'dm', hp: 6, maxHp: 40 },
  play: async ({ canvasElement }) => {
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(6, 40));
  },
});

export const Dead = meta.story({
  name: 'Dead',
  args: { viewer: 'dm', hp: -3, maxHp: 18 },
  play: async ({ canvasElement }) => {
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(-3, 18));
    await expect(getComputedStyle(boxOf(canvasElement)).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  },
});

export const Temp = meta.story({
  name: 'Temp',
  args: { viewer: 'dm', hp: 30, maxHp: 30, tempHp: 5 },
  play: async ({ canvas, canvasElement }) => {
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(30, 30));
    await expect(getComputedStyle(canvas.getByText('+5 temp')).color).toBe(rgb(base.ink));
  },
});

export const Disabled = meta.story({
  name: 'Disabled',
  args: { viewer: 'dm', hp: 18, maxHp: 18, disabled: true },
  play: async ({ canvas, canvasElement }) => {
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(18, 18));
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
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Full')).toBeVisible();
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

export const OwnBloodied = meta.story({
  name: 'Own, Bloodied',
  args: { viewer: 'player', hp: 13, maxHp: 36, mine: true },
  play: async ({ canvasElement }) => {
    const numbers = boxOf(canvasElement).firstElementChild;
    await expect(numbers && getComputedStyle(numbers).borderBottomStyle).toBe('dashed');
    await expect(getComputedStyle(boxOf(canvasElement)).backgroundColor).toBe(
      rgb(healthTints.bloodied),
    );
  },
});

export const OwnTemp = meta.story({
  name: 'Own, temp',
  args: { viewer: 'player', hp: 20, maxHp: 36, tempHp: 5, mine: true },
  play: async ({ canvas }) => {
    await expect(getComputedStyle(canvas.getByText('+5 temp')).color).toBe(rgb(hpActions.setTemp));
  },
});

export const Enemy = meta.story({
  name: 'Enemy',
  args: { viewer: 'player', status: 'bloodied', hp: undefined, maxHp: undefined },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Bloodied')).toBeVisible();
    await expect(boxOf(canvasElement)).toHaveTextContent(/^Bloodied$/);
  },
});

export const EnemyDead = meta.story({
  name: 'Enemy, dead',
  args: { viewer: 'player', status: 'dead', hp: undefined, maxHp: undefined },
  play: async ({ canvasElement }) => {
    const box = boxOf(canvasElement);
    await expect(box).toHaveTextContent(/^Dead$/);
    await expect(getComputedStyle(box).backgroundColor).toBe(rgb(base.soft));
  },
});

export const EdgeCasesThreeDigits287320 = meta.story({
  name: '287/320',
  args: { viewer: 'dm', hp: 287, maxHp: 320 },
  play: async ({ canvasElement }) => {
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(287, 320));
  },
});

export const EdgeCasesThreeDigits112320Temp = meta.story({
  name: '112/320 + temp',
  args: { viewer: 'dm', hp: 112, maxHp: 320, tempHp: 120 },
  play: async ({ canvas, canvasElement }) => {
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(112, 320));
    await expect(canvas.getByText('+120 temp')).toBeVisible();
  },
});

export const EdgeCasesThreeDigits9999992 = meta.story({
  name: '−999/999',
  args: { viewer: 'dm', hp: -999, maxHp: 999 },
  play: async ({ canvas, canvasElement }) => {
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(-999, 999));
    await expect(canvas.getByText('−999')).toBeVisible();
  },
});

export const EdgeCasesThreeDigits999999 = meta.story({
  name: '999/999',
  args: { viewer: 'dm', hp: 999, maxHp: 999 },
  play: async ({ canvasElement }) => {
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(999, 999));
  },
});

export const EdgeCasesThreeDigits105320 = meta.story({
  name: '−105/320',
  args: { viewer: 'dm', hp: -105, maxHp: 320 },
  play: async ({ canvas, canvasElement }) => {
    await expect(dmBoxFacts(boxOf(canvasElement))).toEqual(dmBoxExpected(-105, 320));
    await expect(canvas.getByText('−105')).toBeVisible();
  },
});

export const Player187240 = meta.story({
  name: 'Player 187/240',
  args: { viewer: 'player', hp: 187, maxHp: 240, tempHp: 120 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Wounded')).toBeVisible();
    await expect(canvas.getByText('+120 temp')).toBeVisible();
  },
});

export const PlayerOwn287320 = meta.story({
  name: 'Player own 287/320',
  args: { viewer: 'player', hp: 287, maxHp: 320, mine: true },
});

const bloodiedWithTemp = { viewer: 'dm', hp: 112, maxHp: 320, tempHp: 5 } as const;

export const DeBloodied = meta.story({
  name: 'de · Bloodied',
  globals: { locale: 'de' },
  args: bloodiedWithTemp,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Blutend')).toBeVisible();
    await expect(canvas.getByText('+5 temp')).toBeVisible();
  },
});

export const EsBloodied = meta.story({
  name: 'es · Bloodied',
  globals: { locale: 'es' },
  args: bloodiedWithTemp,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Malherido')).toBeVisible();
    await expect(canvas.getByText('+5 temp.')).toBeVisible();
  },
});

export const FrBloodied = meta.story({
  name: 'fr · Bloodied',
  globals: { locale: 'fr' },
  args: bloodiedWithTemp,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Ensanglanté')).toBeVisible();
    await expect(canvas.getByText('+5 temp.')).toBeVisible();
  },
});

export const JaBloodied = meta.story({
  name: 'ja · Bloodied',
  globals: { locale: 'ja' },
  args: bloodiedWithTemp,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('重傷')).toBeVisible();
    await expect(canvas.getByText('+5 一時')).toBeVisible();
  },
});

export const RuBloodied = meta.story({
  name: 'ru · Bloodied',
  globals: { locale: 'ru' },
  args: bloodiedWithTemp,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Тяжело ранен')).toBeVisible();
    await expect(canvas.getByText('+5 врем.')).toBeVisible();
  },
});

export const PlayerFr = meta.story({
  name: 'Player fr',
  globals: { locale: 'fr' },
  args: { viewer: 'player', hp: 112, maxHp: 320 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Ensanglanté')).toBeVisible();
  },
});

export const PlayerRu = meta.story({
  name: 'Player ru',
  globals: { locale: 'ru' },
  args: { viewer: 'player', hp: 112, maxHp: 320 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Тяжело ранен')).toBeVisible();
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
  render: (args) => (
    <HpBoxCell {...args} onClick={args.viewer === 'dm' ? args.onClick : undefined} />
  ),
  play: async ({ args, canvas, canvasElement }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
    await userEvent.click(boxOf(canvasElement));
    await expect(args.onClick).not.toHaveBeenCalled();
    await expect(canvas.getByText('Wounded')).toBeVisible();
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
  play: async ({ canvasElement }) => {
    for (const hp of [40, 24, 14, 6, -3]) {
      const step = canvasElement.querySelector<HTMLElement>(`[data-step="${hp}"]`);
      if (!step) throw new Error(`step ${hp} not rendered`);
      await expect(dmBoxFacts(boxOf(step))).toEqual(dmBoxExpected(hp, 40));
    }
  },
});
