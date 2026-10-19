import preview from '#.storybook/preview';
import type { HpHistoryEntry, HpHistoryKind, Unit } from '@combat-planner/domain';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { layout } from '../../layout.ts';
import { UnitRow } from '../UnitRow/UnitRow.tsx';
import { NumpadSheet, hpAfter, useHpFlash } from './NumpadSheet.tsx';
import type { NumpadViewer } from './NumpadSheet.tsx';

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
  viewer?: NumpadViewer;
  tap?: HpHistoryKind;
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
  viewer = 'dm',
  tap,
  onApply,
  onClose,
}: NumpadSheetCellProps) {
  const before: Unit = { ...units[who], tempHp };
  const [opened, setOpened] = useState(true);
  const [after, setAfter] = useState<Unit | null>(null);
  const { flashing, flash } = useHpFlash();
  const claimedByName = before.claimedBy ? 'Mika' : undefined;
  return (
    <div style={stage}>
      {after ? (
        <div style={resultList}>
          <UnitRow {...readOnlyRow} unit={before} claimedByName={claimedByName} />
          <UnitRow
            {...readOnlyRow}
            unit={after}
            claimedByName={claimedByName}
            flash={flashing}
            data-result=""
          />
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
        viewer={viewer}
        data-tap={tap}
        onApply={(kind, amount) => {
          onApply?.(kind, amount);
          setAfter({ ...before, ...hpAfter(before, kind, amount) });
          flash();
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

const amountOf = (canvas: Canvas) => canvas.getByRole('status', { name: 'Amount' });

const readingOf = (canvasElement: HTMLElement, side: 'now' | 'after') => {
  const reading = canvasElement.querySelector<HTMLElement>(`[data-side="${side}"]`);
  if (!reading) throw new Error(`${side} reading not rendered`);
  return reading;
};

const numbersOf = (canvasElement: HTMLElement, side: 'now' | 'after') =>
  readingOf(canvasElement, side).querySelector('[data-part="numbers"]');

const actionNames = ['Damage', 'Heal', 'Set Temp', 'Set Max'];

const previewAction = async (canvas: Canvas, name: string) => {
  await userEvent.hover(canvas.getByRole('button', { name }));
};

const expandHistory = async (canvas: Canvas, title: string) => {
  const dialog = await sheetOf(canvas);
  await userEvent.click(within(dialog).getByRole('button', { name: new RegExp(`^${title}`) }));
  dialog.focus();
};

const scrollSheetToTop = async (canvasElement: HTMLElement) => {
  const body = canvasElement.querySelector<HTMLElement>('[data-sheet-content]');
  if (!body) throw new Error('sheet content not rendered');
  await expect(body.scrollTop).toBeGreaterThan(0);
  body.scrollTop = 0;
};

export const Anatomy = meta.story({
  name: 'Anatomy',
  play: async ({ canvas, canvasElement }) => {
    await typeAmount(canvas, '12');
    await expect(amountOf(canvas)).toHaveTextContent('12');
    await expect(numbersOf(canvasElement, 'now')).toHaveTextContent('14/40');
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent('2/40');
    await expect(readingOf(canvasElement, 'after')).toHaveTextContent('Staggered');
  },
});

export const Collapsed = meta.story({
  name: 'Collapsed',
  play: async ({ args, canvas }) => {
    const dialog = await sheetOf(canvas);
    await expect(within(dialog).getByRole('heading', { name: 'Orc Berserker' })).toBeVisible();
    await expect(amountOf(canvas)).toHaveTextContent('0');
    for (const name of actionNames) {
      await expect(canvas.getByRole('button', { name })).toBeDisabled();
    }
    await userEvent.click(canvas.getByRole('button', { name: 'Damage' }), {
      pointerEventsCheck: 0,
    });
    await expect(args.onApply).not.toHaveBeenCalled();
    await expect(canvas.getByRole('button', { name: /^HP History/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  },
});

export const OpenNoChangesYet = meta.story({
  name: 'Open, no changes yet',
  args: { history: 'none' },
  play: async ({ canvas }) => {
    await expandHistory(canvas, 'HP History');
    await expect(canvas.getByText('No changes yet')).toBeVisible();
  },
});

export const OpenAFewChanges = meta.story({
  name: 'Open, a few changes',
  args: { who: 'vashti', history: 'short' },
  play: async ({ canvas }) => {
    await expandHistory(canvas, 'HP History');
    await expect(canvas.getAllByRole('listitem')).toHaveLength(3);
  },
});

export const OpenEveryKind = meta.story({
  name: 'Open, every kind',
  play: async ({ canvas }) => {
    await expandHistory(canvas, 'HP History');
    await expect(canvas.getAllByRole('listitem')).toHaveLength(6);
  },
});

export const OpenLongScrollsInsideTheSheet = meta.story({
  name: 'Open, long: scrolls inside the sheet',
  args: { history: 'long' },
  play: async ({ canvas }) => {
    await expandHistory(canvas, 'HP History');
    await expect(canvas.getAllByRole('listitem')).toHaveLength(10);
    await expect(canvas.getByRole('list', { name: 'HP History' })).toHaveAttribute('data-long');
  },
});

export const PlayerTyped7 = meta.story({
  name: 'Player, typed 7',
  args: { who: 'vashti', viewer: 'player' },
  play: async ({ canvas, canvasElement }) => {
    await typeAmount(canvas, '7');
    await expect(canvas.queryByRole('button', { name: 'Set Max' })).toBeNull();
    await expect(canvas.getByRole('button', { name: 'Set Temp' })).toBeEnabled();
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent('13/36');
  },
});

export const PlayerPressedDamage = meta.story({
  name: 'Player, pressed Damage',
  args: { who: 'vashti', viewer: 'player', tap: 'damage' },
  play: async ({ canvas, canvasElement }) => {
    await typeAmount(canvas, '7');
    await expect(canvas.getByRole('button', { name: 'Damage' })).toHaveAttribute('data-tap');
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent('13/36');
  },
});

export const Opened287320 = meta.story({
  name: 'Opened, 287/320',
  args: { who: 'dragon' },
  play: async ({ canvas, canvasElement }) => {
    await sheetOf(canvas);
    await expect(numbersOf(canvasElement, 'now')).toHaveTextContent('287/320');
    await expect(numbersOf(canvasElement, 'now')).toHaveAttribute('data-compact');
  },
});

export const Damage120167320 = meta.story({
  name: 'Damage 120 → 167/320',
  args: { who: 'dragon' },
  play: async ({ canvas, canvasElement }) => {
    await typeAmount(canvas, '120');
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent('167/320');
    await expect(readingOf(canvasElement, 'after')).toHaveTextContent('Wounded');
  },
});

export const Damage400113320 = meta.story({
  name: 'Damage 400 → −113/320',
  args: { who: 'dragon' },
  play: async ({ canvas, canvasElement }) => {
    await typeAmount(canvas, '400');
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent('−113/320');
    await expect(readingOf(canvasElement, 'after')).toHaveTextContent('Dead');
  },
});

export const SetMax999 = meta.story({
  name: 'Set Max 999',
  args: { who: 'dragon' },
  play: async ({ canvas, canvasElement }) => {
    await typeAmount(canvas, '999');
    await previewAction(canvas, 'Set Max');
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent('287/999');
    await expect(readingOf(canvasElement, 'after')).toHaveTextContent('Staggered');
  },
});

const openLocale = async (
  { canvas, canvasElement }: { canvas: Canvas; canvasElement: HTMLElement },
  history: string,
  action: string,
) => {
  await typeAmount(canvas, '12');
  await expandHistory(canvas, history);
  await scrollSheetToTop(canvasElement);
  return canvas.getByRole('button', { name: action });
};

export const Deutsch = meta.story({
  name: 'Deutsch',
  globals: { locale: 'de' },
  play: async (context) => {
    await expect(await openLocale(context, 'TP-Verlauf', 'Temp. setzen')).toBeEnabled();
    await expect(context.canvas.getByText('Danach')).toBeVisible();
  },
});

export const EspaOl = meta.story({
  name: 'Español',
  globals: { locale: 'es' },
  play: async (context) => {
    await expect(await openLocale(context, 'Historial de PG', 'Fijar máx.')).toBeEnabled();
    await expect(context.canvas.getByText('Después')).toBeVisible();
  },
});

export const FranAis = meta.story({
  name: 'Français',
  globals: { locale: 'fr' },
  play: async (context) => {
    await expect(await openLocale(context, 'Historique des PV', 'Dégâts')).toBeEnabled();
    await expect(context.canvas.getByText('Après')).toBeVisible();
  },
});

export const EdgeCasesLanguages = meta.story({
  name: '日本語',
  globals: { locale: 'ja' },
  play: async (context) => {
    await expect(await openLocale(context, 'HP履歴', '最大HP')).toBeEnabled();
    await expect(context.canvas.getByText('変更後')).toBeVisible();
  },
});

export const EdgeCasesLanguages2 = meta.story({
  name: 'Русский',
  globals: { locale: 'ru' },
  play: async (context) => {
    await expect(await openLocale(context, 'История ОЗ', 'Макс. ОЗ')).toBeEnabled();
    await expect(context.canvas.getByText('После')).toBeVisible();
  },
});

export const ExtraKeysAppendUpToThreeDigits = meta.story({
  name: 'Keys append up to three digits, < deletes, C clears',
  play: async ({ args, canvas }) => {
    const dialog = await sheetOf(canvas);
    const keys = within(dialog).getByRole('group', { name: 'Keypad' });
    for (const digit of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
      await expect(within(keys).getByRole('button', { name: digit })).toBeVisible();
    }
    await typeAmount(canvas, '0');
    await expect(amountOf(canvas)).toHaveTextContent('0');
    await expect(canvas.getByRole('button', { name: 'Damage' })).toBeDisabled();
    await typeAmount(canvas, '4');
    await expect(amountOf(canvas)).toHaveTextContent('4');
    await typeAmount(canvas, '5');
    await expect(amountOf(canvas)).toHaveTextContent('45');
    await typeAmount(canvas, '6');
    await expect(amountOf(canvas)).toHaveTextContent('456');
    await typeAmount(canvas, '7');
    await expect(amountOf(canvas)).toHaveTextContent('456');
    await userEvent.click(within(keys).getByRole('button', { name: 'Delete' }));
    await expect(amountOf(canvas)).toHaveTextContent('45');
    await userEvent.click(within(keys).getByRole('button', { name: 'Clear' }));
    await expect(amountOf(canvas)).toHaveTextContent('0');
    for (const name of actionNames) {
      await expect(canvas.getByRole('button', { name })).toBeDisabled();
    }
    await typeAmount(canvas, '3');
    await userEvent.click(within(keys).getByRole('button', { name: 'Delete' }));
    await expect(canvas.getByRole('button', { name: 'Heal' })).toBeDisabled();
    await expect(args.onApply).not.toHaveBeenCalled();
  },
});

export const ExtraKeyboard = meta.story({
  name: 'Keyboard: digits and Backspace type, Escape closes',
  play: async ({ args, canvas }) => {
    const dialog = await sheetOf(canvas);
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    await userEvent.keyboard('2345');
    await expect(amountOf(canvas)).toHaveTextContent('234');
    await userEvent.keyboard('{Backspace}');
    await expect(amountOf(canvas)).toHaveTextContent('23');
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledOnce();
    await expect(args.onApply).not.toHaveBeenCalled();
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  },
});

export const ExtraEnterOnFocusedAction = meta.story({
  name: 'Enter on a focused action previews and applies it',
  play: async ({ args, canvas, canvasElement }) => {
    await typeAmount(canvas, '5');
    const heal = canvas.getByRole('button', { name: 'Heal' });
    heal.focus();
    await expect(heal).toHaveFocus();
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent('19/40');
    await userEvent.keyboard('{Enter}');
    await expect(args.onApply).toHaveBeenCalledOnce();
    await expect(args.onApply).toHaveBeenCalledWith('heal', 5);
  },
});

export const ExtraEveryDigitAppends = meta.story({
  name: 'Every key 0–9 appends its digit',
  play: async ({ canvas }) => {
    const dialog = await sheetOf(canvas);
    const keys = within(dialog).getByRole('group', { name: 'Keypad' });
    for (const digit of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      await userEvent.click(within(keys).getByRole('button', { name: 'Clear' }));
      await typeAmount(canvas, `1${digit}`);
      await expect(amountOf(canvas)).toHaveTextContent(`1${digit}`);
    }
  },
});

export const ExtraSetTempZero = meta.story({
  name: 'Set Temp at 0 clears temp HP, the other actions stay disabled',
  args: { tempHp: 5 },
  play: async ({ args, canvas, canvasElement }) => {
    await typeAmount(canvas, '0');
    await expect(canvas.getByRole('button', { name: 'Damage' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Heal' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Set Max' })).toBeDisabled();
    const setTemp = canvas.getByRole('button', { name: 'Set Temp' });
    await expect(setTemp).toBeEnabled();
    await previewAction(canvas, 'Set Temp');
    await expect(
      readingOf(canvasElement, 'now').querySelector('[data-part="temp"]'),
    ).not.toBeNull();
    await expect(readingOf(canvasElement, 'after').querySelector('[data-part="temp"]')).toBeNull();
    await userEvent.click(setTemp);
    await expect(args.onApply).toHaveBeenCalledOnce();
    await expect(args.onApply).toHaveBeenCalledWith('temp', 0);
  },
});

export const ExtraDoubleTapAppliesOnce = meta.story({
  name: 'A second tap during the exit transition does not apply twice',
  parameters: { motion: 'on' },
  play: async ({ args, canvas }) => {
    await typeAmount(canvas, '5');
    const damage = canvas.getByRole('button', { name: 'Damage' });
    damage.click();
    damage.click();
    await expect(args.onApply).toHaveBeenCalledOnce();
    await expect(args.onApply).toHaveBeenCalledWith('damage', 5);
  },
});

export const ExtraSpaceOnAction = meta.story({
  name: 'Space on a focused action applies it',
  play: async ({ args, canvas }) => {
    await typeAmount(canvas, '5');
    canvas.getByRole('button', { name: 'Heal' }).focus();
    await userEvent.keyboard(' ');
    await expect(args.onApply).toHaveBeenCalledOnce();
    await expect(args.onApply).toHaveBeenCalledWith('heal', 5);
  },
});

export const ExtraTapDoesNotPinPreview = meta.story({
  name: 'The tap marker does not pin the After preview',
  args: { tap: 'heal' },
  play: async ({ canvas, canvasElement }) => {
    await typeAmount(canvas, '8');
    await previewAction(canvas, 'Damage');
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent('6/40');
    await expect(canvas.getByRole('button', { name: 'Heal' })).toHaveAttribute('data-tap');
  },
});

export const ExtraActionPressedColour = meta.story({
  name: 'A pressed action takes the Button pressed colour',
  play: async ({ canvas }) => {
    await typeAmount(canvas, '5');
    const damage = canvas.getByRole('button', { name: 'Damage' });
    damage.setAttribute('data-pressed', '');
    await expect(getComputedStyle(damage).backgroundColor).toBe('rgb(58, 53, 49)');
  },
});

export const ExtraCloseWithoutChange = meta.story({
  name: 'Close button closes without a change',
  play: async ({ args, canvas }) => {
    await typeAmount(canvas, '9');
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
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
  result: string;
}

const runFlow = async (
  canvas: Canvas,
  canvasElement: HTMLElement,
  args: { onApply?: unknown; onClose?: unknown },
  step: FlowStep,
) => {
  await sheetOf(canvas);
  for (const name of step.args.viewer === 'player' ? actionNames.slice(0, 3) : actionNames) {
    await expect(canvas.getByRole('button', { name })).toBeDisabled();
  }
  await expect(numbersOf(canvasElement, 'after')).toHaveTextContent(step.now);
  await typeAmount(canvas, step.amount);
  await previewAction(canvas, step.action);
  await expect(numbersOf(canvasElement, 'after')).toHaveTextContent(step.after);
  await userEvent.click(canvas.getByRole('button', { name: step.action }));
  await expect(args.onApply).toHaveBeenCalledOnce();
  await expect(args.onApply).toHaveBeenCalledWith(step.kind, Number(step.amount));
  await expect(args.onClose).toHaveBeenCalledOnce();
  await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull());
  const result = canvasElement.querySelector('[data-result]');
  await expect(result).toHaveAttribute('data-flash');
  await expect(result).toHaveTextContent(step.result);
};

const typedPlay =
  (step: FlowStep) =>
  async ({ canvas, canvasElement }: { canvas: Canvas; canvasElement: HTMLElement }) => {
    await typeAmount(canvas, step.amount);
    await previewAction(canvas, step.action);
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent(step.after);
    await expect(canvas.getByRole('button', { name: step.action })).toBeEnabled();
  };

const pressedPlay =
  (step: FlowStep) =>
  async ({ canvas, canvasElement }: { canvas: Canvas; canvasElement: HTMLElement }) => {
    await typeAmount(canvas, step.amount);
    await expect(canvas.getByRole('button', { name: step.action })).toHaveAttribute('data-tap');
    await previewAction(canvas, step.action);
    await expect(numbersOf(canvasElement, 'after')).toHaveTextContent(step.after);
  };

const step = (
  args: FlowStep['args'],
  [amount, action, kind]: [string, string, HpHistoryKind],
  [now, after, result]: [string, string, string],
): FlowStep => ({ args, amount, action, kind, now, after, result });

const np1 = step({}, ['12', 'Damage', 'damage'], ['14/40', '2/40', '2/40']);
const np2 = step({ tempHp: 5 }, ['8', 'Damage', 'damage'], ['14/40', '11/40', '11/40']);
const np3 = step({ who: 'vashti' }, ['8', 'Heal', 'heal'], ['20/36', '28/36', '28/36']);
const np4 = step({}, ['5', 'Set Temp', 'temp'], ['14/40', '14/40', '+5 temp']);
const np5 = step({}, ['30', 'Set Max', 'max'], ['14/40', '14/30', '14/30']);

export const ExtraNp1Pressed = meta.story({
  name: 'NP-1 · 3 · Pressed Damage',
  args: { ...np1.args, tap: np1.kind },
  play: async (context) => {
    await pressedPlay(np1)(context);
    await expect(context.args.onApply).not.toHaveBeenCalled();
  },
});

export const NP1 = meta.story({
  name: 'NP-1 · Damage',
  args: np1.args,
  play: async ({ args, canvas, canvasElement }) => {
    await runFlow(canvas, canvasElement, args, np1);
    await expect(canvasElement.querySelectorAll('[data-readonly]')).toHaveLength(2);
  },
});

export const ExtraNp2Opened = meta.story({
  name: 'NP-2 · 1 · Opened: actions disabled',
  args: np2.args,
  play: async ({ canvas, canvasElement }) => {
    await sheetOf(canvas);
    await expect(readingOf(canvasElement, 'now')).toHaveTextContent('+5 temp');
    await expect(canvas.getByRole('button', { name: 'Damage' })).toBeDisabled();
  },
});

export const ExtraNp2Typed = meta.story({
  name: 'NP-2 · 2 · Typed 8: After previews',
  args: np2.args,
  play: async (context) => {
    await typedPlay(np2)(context);
    await expect(readingOf(context.canvasElement, 'after')).not.toHaveTextContent('temp');
  },
});

export const ExtraNp2Pressed = meta.story({
  name: 'NP-2 · 3 · Pressed Damage',
  args: { ...np2.args, tap: np2.kind },
  play: async (context) => {
    await pressedPlay(np2)(context);
    await expect(context.args.onApply).not.toHaveBeenCalled();
  },
});

export const NP2 = meta.story({
  name: 'NP-2 · Damage with temp',
  args: np2.args,
  play: async ({ args, canvas, canvasElement }) => {
    await runFlow(canvas, canvasElement, args, np2);
    await expect(canvasElement.querySelectorAll('[data-readonly]')).toHaveLength(2);
  },
});

export const ExtraNp3Opened = meta.story({
  name: 'NP-3 · 1 · Opened: actions disabled',
  args: np3.args,
  play: async ({ canvas, canvasElement }) => {
    await sheetOf(canvas);
    await expect(numbersOf(canvasElement, 'now')).toHaveTextContent('20/36');
    await expect(canvas.getByRole('button', { name: 'Heal' })).toBeDisabled();
  },
});

export const ExtraNp3Typed = meta.story({
  name: 'NP-3 · 2 · Typed 8: After previews',
  args: np3.args,
  play: async (context) => {
    await typedPlay(np3)(context);
    await expect(readingOf(context.canvasElement, 'after')).toHaveTextContent('Wounded');
  },
});

export const ExtraNp3Pressed = meta.story({
  name: 'NP-3 · 3 · Pressed Heal',
  args: { ...np3.args, tap: np3.kind },
  play: async (context) => {
    await pressedPlay(np3)(context);
    await expect(context.args.onApply).not.toHaveBeenCalled();
  },
});

export const NP3 = meta.story({
  name: 'NP-3 · Heal',
  args: np3.args,
  play: async ({ args, canvas, canvasElement }) => {
    await runFlow(canvas, canvasElement, args, np3);
    await expect(canvasElement.querySelectorAll('[data-readonly]')).toHaveLength(2);
  },
});

export const ExtraNp4Typed = meta.story({
  name: 'NP-4 · 2 · Typed 5: After previews',
  args: np4.args,
  play: async (context) => {
    await typedPlay(np4)(context);
    await expect(readingOf(context.canvasElement, 'after')).toHaveTextContent('+5 temp');
  },
});

export const ExtraNp4Pressed = meta.story({
  name: 'NP-4 · 3 · Pressed Set Temp',
  args: { ...np4.args, tap: np4.kind },
  play: async (context) => {
    await pressedPlay(np4)(context);
    await expect(context.args.onApply).not.toHaveBeenCalled();
  },
});

export const NP4 = meta.story({
  name: 'NP-4 · Set Temp',
  args: np4.args,
  play: async ({ args, canvas, canvasElement }) => {
    await runFlow(canvas, canvasElement, args, np4);
    await expect(canvasElement.querySelectorAll('[data-readonly]')).toHaveLength(2);
  },
});

export const ExtraNp5Typed = meta.story({
  name: 'NP-5 · 2 · Typed 30: After previews',
  args: np5.args,
  play: async (context) => {
    await typedPlay(np5)(context);
    await expect(readingOf(context.canvasElement, 'after')).toHaveTextContent('Staggered');
  },
});

export const ExtraNp5Pressed = meta.story({
  name: 'NP-5 · 3 · Pressed Set Max',
  args: { ...np5.args, tap: np5.kind },
  play: async (context) => {
    await pressedPlay(np5)(context);
    await expect(context.args.onApply).not.toHaveBeenCalled();
  },
});

export const NP5 = meta.story({
  name: 'NP-5 · Set Max',
  args: np5.args,
  play: async ({ args, canvas, canvasElement }) => {
    await runFlow(canvas, canvasElement, args, np5);
    await expect(canvasElement.querySelectorAll('[data-readonly]')).toHaveLength(2);
  },
});
