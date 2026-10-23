import preview from '#.storybook/preview';
import type { TFunction } from 'i18next';
import type { HpHistoryEntry, HpHistoryKind, Unit } from '@combat-planner/domain';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { layout } from '../../layout.ts';
import { UnitRow } from '../UnitRow/UnitRow.tsx';
import { NumpadSheet, hpAfter } from './NumpadSheet.tsx';
import { escapeRegExp, storyT } from '../../storybook/storyT.ts';

const at = '2026-10-15T18:00:00.000Z';

const entry = (
  round: number | null,
  kind: HpHistoryKind,
  amount: number,
  result: number,
  previous: number,
  absorbed = 0,
): HpHistoryEntry => ({ kind, amount, absorbed, previous, result, round, at });

const full = [
  entry(3, 'damage', 12, 14, 26),
  entry(3, 'heal', 3, 26, 23),
  entry(2, 'damage', 8, 23, 26, 5),
  entry(2, 'temp', 5, 26, 0),
  entry(1, 'damage', 14, 26, 40),
  entry(1, 'max', 40, 40, 45),
];

const vashtiHistory = [
  entry(3, 'damage', 7, 20, 27),
  entry(2, 'damage', 9, 27, 36),
  entry(1, 'max', 36, 36, 32),
];

const long = [
  ...full,
  entry(null, 'damage', 3, 42, 45),
  entry(null, 'heal', 3, 45, 42),
  entry(null, 'damage', 6, 39, 45),
  entry(null, 'max', 45, 45, 40),
];

const histories = { none: [], short: vashtiHistory, full, long } as const;

type HistorySet = keyof typeof histories;

const MIKA = '01JC0000000000000000000MKA';

const unitDefaults = {
  initiativeBonus: 0,
  tempHp: 0,
  acMod: 0,
  pdMod: 0,
  mdMod: 0,
  note: '',
  disabled: false,
  claimedBy: null,
  hpHistory: [],
};

const units = {
  orc: {
    ...unitDefaults,
    id: '01JC00000000000000000RCBRS',
    name: 'Orc Berserker',
    role: 'enemy',
    initiative: 17,
    hp: 14,
    maxHp: 40,
    ac: 18,
    pd: 16,
    md: 12,
    conditions: ['hampered'],
  },
  dragon: {
    ...unitDefaults,
    id: '01JC000000000000000DRAGN1',
    name: 'Ancient Black Dragon',
    role: 'enemy',
    initiative: 22,
    hp: 287,
    maxHp: 320,
    ac: 24,
    pd: 22,
    md: 20,
    conditions: [],
  },
  vashti: {
    ...unitDefaults,
    id: '01JC00000000000000000VASHT',
    name: 'Vashti the Hexer',
    role: 'hero',
    initiative: 15,
    hp: 20,
    maxHp: 36,
    ac: 16,
    pd: 14,
    md: 19,
    conditions: ['dazed'],
    claimedBy: MIKA,
  },
} as const satisfies Record<string, Unit>;

type Who = keyof typeof units;

interface NumpadSheetCellProps {
  who?: Who;
  tempHp?: number;
  history?: HistorySet;
  onApply?: (kind: HpHistoryKind, amount: number) => void;
  onClose?: () => void;
}

const stage: CSSProperties = { position: 'absolute', inset: 0, contain: 'layout' };

const resultList: CSSProperties = {
  display: 'grid',
  gap: layout.listGap,
  padding: `${layout.statusBar + layout.contentEdge}px ${layout.contentEdge}px`,
};

const noop = () => {};

const readOnlyRow = {
  readOnly: true,
  onToggle: noop,
  onInitiative: noop,
  onInitiativeSet: noop,
  onInitiativeRoll: noop,
  onInitiativeClose: noop,
  onHp: noop,
  onConditions: noop,
  onHistory: noop,
  onNoteChange: noop,
  onEdit: noop,
  onMore: noop,
  onMenuClose: noop,
  onDuplicate: noop,
  onSetDisabled: noop,
  onSaveAsPreset: noop,
  onReleaseClaim: noop,
  onRemove: noop,
};

function NumpadSheetCell({
  who = 'orc',
  tempHp = 0,
  history = 'full',
  onApply,
  onClose,
}: NumpadSheetCellProps) {
  const before: Unit = { ...units[who], tempHp };
  const [opened, setOpened] = useState(true);
  const [after, setAfter] = useState<Unit | null>(null);
  const claimedByName = before.claimedBy ? 'Mika' : undefined;
  return (
    <div style={stage}>
      {after ? (
        <div style={resultList}>
          <UnitRow {...readOnlyRow} unit={before} claimedByName={claimedByName} />
          <UnitRow {...readOnlyRow} unit={after} claimedByName={claimedByName} data-result="" />
        </div>
      ) : null}
      <NumpadSheet
        opened={opened}
        name={before.name}
        role={before.role}
        initiative={before.initiative}
        hp={before.hp}
        maxHp={before.maxHp}
        tempHp={before.tempHp}
        history={histories[history]}
        onApply={(kind, amount) => {
          onApply?.(kind, amount);
          setAfter({ ...before, ...hpAfter(before, kind, amount) });
        }}
        onClose={() => {
          setOpened(false);
          onClose?.();
        }}
      />
    </div>
  );
}

const meta = preview.meta({
  title: 'Organisms/NumpadSheet',
  component: NumpadSheetCell,
  parameters: { phoneFrame: { overlay: true } },
  args: { onApply: fn(), onClose: fn() },
});

type Canvas = ReturnType<typeof within>;

const sheetOf = async (canvas: Canvas) => canvas.findByRole('dialog');

const typeAmount = async (canvas: Canvas, digits: string) => {
  const dialog = await sheetOf(canvas);
  for (const digit of digits) {
    await userEvent.click(within(dialog).getByRole('button', { name: digit }));
  }
  dialog.focus();
};

const amountOf = (canvas: Canvas, t: TFunction) =>
  canvas.getByRole('status', { name: t('amount') });

const readingOf = (canvasElement: HTMLElement, side: 'now' | 'after') => {
  const reading = canvasElement.querySelector<HTMLElement>(`[data-side="${side}"]`);
  if (!reading) throw new Error(`${side} reading not rendered`);
  return reading;
};

const numbersOf = (canvasElement: HTMLElement, side: 'now' | 'after') =>
  readingOf(canvasElement, side).querySelector('[data-part="numbers"]');

const screenOf = (canvasElement: HTMLElement) => {
  const frame = canvasElement.ownerDocument.querySelector<HTMLElement>('[data-phone-frame]');
  if (!frame) throw new Error('phone frame not rendered');
  return { width: frame.clientWidth, height: frame.clientHeight };
};

const filledPips = (canvasElement: HTMLElement, side: 'now' | 'after') =>
  readingOf(canvasElement, side).querySelectorAll('[data-filled]').length;

const isVisuallyHidden = (element: Element | null) => {
  if (!element) throw new Error('hidden text not rendered');
  const style = getComputedStyle(element);
  return style.clip !== 'auto' || style.clipPath !== 'none';
};

const actionKeys = ['damage', 'heal', 'setTemp', 'setMax'];

const previewAction = async (canvas: Canvas, name: string) => {
  await userEvent.hover(canvas.getByRole('button', { name }));
};

const expandHistory = async (canvas: Canvas, title: string) => {
  const dialog = await sheetOf(canvas);
  await userEvent.click(
    within(dialog).getByRole('button', { name: new RegExp(`^${escapeRegExp(title)}`) }),
  );
  dialog.focus();
};

const scrollSheetToTop = async (canvasElement: HTMLElement) => {
  const body = canvasElement.querySelector<HTMLElement>('[data-sheet-content]');
  if (!body) throw new Error('sheet content not rendered');
  await expect(body.scrollTop).toBeGreaterThan(0);
  body.scrollTop = 0;
};

export const AmountTyped = meta.story({
  tags: ['visual'],
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await typeAmount(canvas, '12');
    await expect(amountOf(canvas, t)).toHaveTextContent('12');
    await expect(numbersOf(canvasElement, 'now')).toHaveTextContent('14/40');
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent('2/40');
    await expect(readingOf(canvasElement, 'after')).toHaveTextContent(t('staggered'));
    await expect(
      isVisuallyHidden(readingOf(canvasElement, 'after').querySelector('[data-part="status"]')),
    ).toBe(true);
    await expect(filledPips(canvasElement, 'after')).toBe(1);
    const now = readingOf(canvasElement, 'now').getBoundingClientRect();
    const after = readingOf(canvasElement, 'after').getBoundingClientRect();
    const arrow = canvasElement.querySelector('[data-part="arrow"]');
    if (screenOf(canvasElement).width < 384) {
      await expect(arrow).not.toBeVisible();
      await expect(
        numbersOf(canvasElement, 'after')?.getBoundingClientRect().top ?? 0,
      ).toBeGreaterThan(numbersOf(canvasElement, 'now')?.getBoundingClientRect().bottom ?? 0);
    } else {
      await expect(arrow).toBeVisible();
      await expect(after.left).toBeGreaterThan(now.right);
    }
  },
});

export const EmptyAmount = meta.story({
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    const dialog = await sheetOf(canvas);
    await expect(within(dialog).getByRole('heading', { name: 'Orc Berserker' })).toBeVisible();
    await expect(amountOf(canvas, t)).toHaveTextContent('0');
    for (const key of actionKeys) {
      await expect(canvas.getByRole('button', { name: t(key) })).toBeDisabled();
    }
    await userEvent.click(canvas.getByRole('button', { name: t('damage') }), {
      pointerEventsCheck: 0,
    });
    await expect(args.onApply).not.toHaveBeenCalled();
    await expect(
      canvas.getByRole('button', {
        name: (label: string) => label.startsWith(t('HpHistory:title')),
      }),
    ).toHaveAttribute('aria-expanded', 'false');
  },
});

export const HistoryExpandedEmpty = meta.story({
  args: { history: 'none' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await expandHistory(canvas, t('HpHistory:title'));
    await expect(canvas.getByText(t('HpHistory:empty'))).toBeVisible();
  },
});

export const HistoryExpandedFewChanges = meta.story({
  args: { who: 'vashti', history: 'short' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await expandHistory(canvas, t('HpHistory:title'));
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3);
  },
});

export const HistoryExpanded = meta.story({
  tags: ['visual'],
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await expandHistory(canvas, t('HpHistory:title'));
    await expect(canvas.getAllByRole('listitem')).toHaveLength(6);
  },
});

export const HistoryExpandedLong = meta.story({
  args: { history: 'long' },
  play: async ({ canvas, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await expandHistory(canvas, t('HpHistory:title'));
    await expect(canvas.getAllByRole('listitem')).toHaveLength(10);
    const list = canvas.getByRole('list', { name: t('HpHistory:title') });
    await expect(list.closest('[data-scroll-list]')).toHaveAttribute('data-long');
  },
});

export const ThreeDigitHpWounded = meta.story({
  name: 'Three Digit HP Wounded',
  args: { who: 'dragon' },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await typeAmount(canvas, '120');
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent('167/320');
    await expect(readingOf(canvasElement, 'after')).toHaveTextContent(t('wounded'));
  },
});

export const OverkillDead = meta.story({
  args: { who: 'dragon' },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await typeAmount(canvas, '400');
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent('−113/320');
    await expect(readingOf(canvasElement, 'after')).toHaveTextContent(t('dead'));
    await expect(filledPips(canvasElement, 'after')).toBe(0);
  },
});

export const SetMaxPreview = meta.story({
  args: { who: 'dragon' },
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await typeAmount(canvas, '999');
    await previewAction(canvas, t('setMax'));
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent('287/999');
    await expect(readingOf(canvasElement, 'after')).toHaveTextContent(t('staggered'));
  },
});

export const AmountTypedHistoryExpanded = meta.story({
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await typeAmount(canvas, '12');
    await expandHistory(canvas, t('HpHistory:title'));
    await scrollSheetToTop(canvasElement);
    await expect(canvas.getByRole('button', { name: t('setMax') })).toBeEnabled();
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent('2/40');
    await expect(canvas.getAllByRole('listitem')).toHaveLength(6);
  },
});

export const KeysAppendUpToThreeDigits = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    const dialog = await sheetOf(canvas);
    const keys = within(dialog).getByRole('group', { name: t('keypad') });
    await expect(
      within(keys)
        .getAllByRole('button')
        .map((key) => key.ariaLabel ?? key.textContent),
    ).toEqual(['1', '2', '3', t('delete'), '4', '5', '6', t('clear'), '7', '8', '9', '0']);
    for (const digit of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
      await expect(within(keys).getByRole('button', { name: digit })).toBeVisible();
    }
    const keyHeight = screenOf(canvasElement).height < 700 ? 44 : 56;
    for (const key of within(keys).getAllByRole('button')) {
      await expect(key.getBoundingClientRect().height).toBe(keyHeight);
    }
    await typeAmount(canvas, '0');
    await expect(amountOf(canvas, t)).toHaveTextContent('0');
    await expect(canvas.getByRole('button', { name: t('damage') })).toBeDisabled();
    await typeAmount(canvas, '4');
    await expect(amountOf(canvas, t)).toHaveTextContent('4');
    await typeAmount(canvas, '5');
    await expect(amountOf(canvas, t)).toHaveTextContent('45');
    await typeAmount(canvas, '6');
    await expect(amountOf(canvas, t)).toHaveTextContent('456');
    await typeAmount(canvas, '7');
    await expect(amountOf(canvas, t)).toHaveTextContent('456');
    await userEvent.click(within(keys).getByRole('button', { name: t('delete') }));
    await expect(amountOf(canvas, t)).toHaveTextContent('45');
    await userEvent.click(within(keys).getByRole('button', { name: t('clear') }));
    await expect(amountOf(canvas, t)).toHaveTextContent('0');
    for (const key of actionKeys) {
      await expect(canvas.getByRole('button', { name: t(key) })).toBeDisabled();
    }
    await typeAmount(canvas, '3');
    await userEvent.click(within(keys).getByRole('button', { name: t('delete') }));
    await expect(canvas.getByRole('button', { name: t('heal') })).toBeDisabled();
    await expect(args.onApply).not.toHaveBeenCalled();
  },
});

export const KeyboardTypesAndEscapeCloses = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    const dialog = await sheetOf(canvas);
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    await userEvent.keyboard('2345');
    await expect(amountOf(canvas, t)).toHaveTextContent('234');
    await userEvent.keyboard('{Backspace}');
    await expect(amountOf(canvas, t)).toHaveTextContent('23');
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onApply).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const EnterOnFocusedActionApplies = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await typeAmount(canvas, '5');
    const heal = canvas.getByRole('button', { name: t('heal') });
    heal.focus();
    await expect(heal).toHaveFocus();
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent('19/40');
    await userEvent.keyboard('{Enter}');
    await expect(args.onApply).toHaveBeenCalledOnce();
    await expect(args.onApply).toHaveBeenCalledWith('heal', 5);
  },
});

export const SetTempZeroClearsTempHp = meta.story({
  name: 'Set Temp Zero Clears Temp HP',
  tags: ['!dev'],
  args: { tempHp: 5 },
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await typeAmount(canvas, '0');
    await expect(canvas.getByRole('button', { name: t('damage') })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: t('heal') })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: t('setMax') })).toBeDisabled();
    const setTemp = canvas.getByRole('button', { name: t('setTemp') });
    await expect(setTemp).toBeEnabled();
    await previewAction(canvas, t('setTemp'));
    await expect(
      readingOf(canvasElement, 'now').querySelector('[data-part="temp"]'),
    ).not.toBeNull();
    await expect(readingOf(canvasElement, 'after').querySelector('[data-part="temp"]')).toBeNull();
    await userEvent.click(setTemp);
    await expect(args.onApply).toHaveBeenCalledOnce();
    await expect(args.onApply).toHaveBeenCalledWith('temp', 0);
  },
});

export const DoubleTapAppliesOnce = meta.story({
  tags: ['!dev'],
  parameters: { motion: 'on' },
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await typeAmount(canvas, '5');
    const damage = canvas.getByRole('button', { name: t('damage') });
    damage.click();
    damage.click();
    await expect(args.onApply).toHaveBeenCalledOnce();
    await expect(args.onApply).toHaveBeenCalledWith('damage', 5);
  },
});

export const CloseWithoutChange = meta.story({
  tags: ['!dev'],
  play: async ({ args, canvas, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await typeAmount(canvas, '9');
    await userEvent.click(canvas.getByRole('button', { name: t('Sheet:close') }));
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onApply).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

interface FlowStep {
  args: Omit<NumpadSheetCellProps, 'onApply' | 'onClose'>;
  amount: string;
  action: string;
  kind: HpHistoryKind;
  now: string;
  after: string;
  result: string | ((t: TFunction) => string);
}

interface StepContext {
  canvas: Canvas;
  canvasElement: HTMLElement;
  globals: Record<string, unknown>;
}

const runFlow = async (
  canvas: Canvas,
  canvasElement: HTMLElement,
  args: { onApply?: unknown; onClose?: unknown },
  step: FlowStep,
  t: TFunction,
) => {
  await sheetOf(canvas);
  for (const key of actionKeys) {
    await expect(canvas.getByRole('button', { name: t(key) })).toBeDisabled();
  }
  await expect(numbersOf(canvasElement, 'after')).toHaveTextContent(step.now);
  await typeAmount(canvas, step.amount);
  await previewAction(canvas, t(step.action));
  await expect(numbersOf(canvasElement, 'after')).toHaveTextContent(step.after);
  await userEvent.click(canvas.getByRole('button', { name: t(step.action) }));
  await expect(args.onApply).toHaveBeenCalledOnce();
  await expect(args.onApply).toHaveBeenCalledWith(step.kind, Number(step.amount));
  await expect(args.onClose).toHaveBeenCalledOnce();
  await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  const result = canvasElement.querySelector('[data-result]');
  await expect(result).toHaveTextContent(
    typeof step.result === 'string' ? step.result : step.result(t),
  );
};

const typedPlay =
  (step: FlowStep) =>
  async ({ canvas, canvasElement, globals }: StepContext) => {
    const t = storyT(globals, 'NumpadSheet');
    await typeAmount(canvas, step.amount);
    await previewAction(canvas, t(step.action));
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent(step.after);
    await expect(canvas.getByRole('button', { name: t(step.action) })).toBeEnabled();
  };

const step = (
  args: FlowStep['args'],
  [amount, action, kind]: [string, string, HpHistoryKind],
  [now, after, result]: [string, string, FlowStep['result']],
): FlowStep => ({ args, amount, action, kind, now, after, result });

const np1 = step({}, ['12', 'damage', 'damage'], ['14/40', '2/40', '2/40']);
const np2 = step({ tempHp: 5 }, ['8', 'damage', 'damage'], ['14/40', '11/40', '11/40']);
const np3 = step({ who: 'vashti' }, ['8', 'heal', 'heal'], ['20/36', '28/36', '28/36']);
const np4 = step({}, ['5', 'setTemp', 'temp'], ['14/40', '14/40', (t) => t('temp', { amount: 5 })]);
const np5 = step({}, ['30', 'setMax', 'max'], ['14/40', '14/30', '14/30']);

export const DamageApplies = meta.story({
  tags: ['!dev'],
  args: np1.args,
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await runFlow(canvas, canvasElement, args, np1, t);
    await expect(canvasElement.querySelectorAll('[data-readonly]')).toHaveLength(2);
  },
});

export const WithTempHp = meta.story({
  name: 'With Temp HP',
  args: np2.args,
  play: async ({ canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await sheetOf(canvas);
    await expect(readingOf(canvasElement, 'now')).toHaveTextContent(t('temp', { amount: 5 }));
    const now = readingOf(canvasElement, 'now');
    await expect(isVisuallyHidden(now.querySelector('[data-part="temp"]'))).toBe(true);
    await expect(now.querySelector('[data-part="tempBadge"]')).toHaveTextContent('+5');
    await expect(now.querySelector('[data-part="tempBadge"]')).toBeVisible();
    await expect(canvas.getByRole('button', { name: t('damage') })).toBeDisabled();
  },
});

export const TempHpAbsorbsDamage = meta.story({
  name: 'Temp HP Absorbs Damage',
  args: np2.args,
  play: async (context) => {
    await typedPlay(np2)(context);
    await expect(
      readingOf(context.canvasElement, 'after').querySelector('[data-part="temp"]'),
    ).toBeNull();
  },
});

export const DamageWithTempApplies = meta.story({
  tags: ['!dev'],
  args: np2.args,
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await runFlow(canvas, canvasElement, args, np2, t);
    await expect(canvasElement.querySelectorAll('[data-readonly]')).toHaveLength(2);
  },
});

export const HealPreview = meta.story({
  args: np3.args,
  play: async (context) => {
    const t = storyT(context.globals, 'NumpadSheet');
    await typedPlay(np3)(context);
    await expect(readingOf(context.canvasElement, 'after')).toHaveTextContent(t('wounded'));
  },
});

export const HealApplies = meta.story({
  tags: ['!dev'],
  args: np3.args,
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await runFlow(canvas, canvasElement, args, np3, t);
    await expect(canvasElement.querySelectorAll('[data-readonly]')).toHaveLength(2);
  },
});

export const SetTempPreview = meta.story({
  args: np4.args,
  play: async (context) => {
    const t = storyT(context.globals, 'NumpadSheet');
    await typedPlay(np4)(context);
    await expect(readingOf(context.canvasElement, 'after')).toHaveTextContent(
      t('temp', { amount: 5 }),
    );
  },
});

export const SetTempApplies = meta.story({
  tags: ['!dev'],
  args: np4.args,
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await runFlow(canvas, canvasElement, args, np4, t);
    await expect(canvasElement.querySelectorAll('[data-readonly]')).toHaveLength(2);
  },
});

export const SetMaxApplies = meta.story({
  tags: ['!dev'],
  args: np5.args,
  play: async ({ args, canvas, canvasElement, globals }) => {
    const t = storyT(globals, 'NumpadSheet');
    await runFlow(canvas, canvasElement, args, np5, t);
    await expect(canvasElement.querySelectorAll('[data-readonly]')).toHaveLength(2);
  },
});
