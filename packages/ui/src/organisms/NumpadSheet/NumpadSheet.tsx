import { LIMITS, apply, healthSegments, healthStatus } from '@combat-planner/domain';
import type { Action, Combat, HpHistoryEntry, HpHistoryKind, Role } from '@combat-planner/domain';
import { UnstyledButton } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../atoms/Button/Button.tsx';
import { useMotion } from '../../provider.tsx';
import { HpHistory } from '../HpHistory/HpHistory.tsx';
import { Sheet } from '../Sheet/Sheet.tsx';
import classes from './NumpadSheet.module.css';

export type NumpadViewer = 'dm' | 'player';

export interface NumpadHealth {
  hp: number;
  maxHp: number;
  tempHp: number;
}

export interface NumpadSheetProps extends NumpadHealth {
  opened: boolean;
  name: string;
  role: Role;
  initiative: number | null;
  history: readonly HpHistoryEntry[];
  viewer?: NumpadViewer;
  onApply: (kind: HpHistoryKind, amount: number) => void;
  onClose: () => void;
  'data-tap'?: HpHistoryKind;
}

export const hpFlashDuration = 2000;

const previewId = '00000000000000000000000000';
const previewAt = '1970-01-01T00:00:00.000Z';
const amountDigits = String(LIMITS.amount.max).length;
const digitKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
const actionKinds = ['damage', 'heal', 'temp', 'max'] as const satisfies readonly HpHistoryKind[];
const actionLabels = {
  damage: 'damage',
  heal: 'heal',
  temp: 'setTemp',
  max: 'setMax',
} as const satisfies Record<HpHistoryKind, string>;
const pipSlots = [0, 1, 2, 3] as const;

function hpAction(kind: HpHistoryKind, amount: number): Action {
  const target = { id: previewId, version: 0, unitId: previewId, amount };
  switch (kind) {
    case 'damage':
      return { ...target, type: 'damage' };
    case 'heal':
      return { ...target, type: 'heal' };
    case 'temp':
      return { ...target, type: 'setTempHp' };
    case 'max':
      return { ...target, type: 'setMaxHp' };
  }
}

export function hpAfter(health: NumpadHealth, kind: HpHistoryKind, amount: number): NumpadHealth {
  if (amount < 0 || (amount === 0 && kind !== 'temp')) return health;
  const combat: Combat = {
    id: previewId,
    title: previewId,
    description: '',
    color: LIMITS.color.min,
    status: 'setup',
    round: LIMITS.round.min,
    escalation: LIMITS.escalation.min,
    activeUnitId: null,
    lastPlayedAt: null,
    linkGeneration: 0,
    version: 0,
    players: {},
    createdAt: previewAt,
    updatedAt: previewAt,
    units: [
      {
        id: previewId,
        name: previewId,
        role: 'enemy',
        initiativeBonus: 0,
        initiative: null,
        maxHp: health.maxHp,
        hp: health.hp,
        tempHp: health.tempHp,
        ac: 0,
        pd: 0,
        md: 0,
        note: '',
        conditions: [],
        disabled: false,
        claimedBy: null,
        hpHistory: [],
      },
    ],
  };
  const result = apply(combat, hpAction(kind, amount), { kind: 'dm' }, previewAt);
  if (!('combat' in result)) return health;
  const unit = result.combat.units[0];
  return unit ? { hp: unit.hp, maxHp: unit.maxHp, tempHp: unit.tempHp } : health;
}

export function useHpFlash(): { flashing: boolean; flash: () => void } {
  const motion = useMotion();
  const [flashing, setFlashing] = useState(false);
  const [started, setStarted] = useState(0);
  const flash = useCallback(() => {
    setFlashing(true);
    setStarted((count) => count + 1);
  }, []);
  useEffect(() => {
    if (started === 0 || motion === 'off') return;
    const timer = setTimeout(() => setFlashing(false), hpFlashDuration);
    return () => clearTimeout(timer);
  }, [started, motion]);
  return { flashing, flash };
}

function formatNumber(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : String(value);
}

interface HpReadingProps {
  label: string;
  health: NumpadHealth;
  side: 'now' | 'after';
}

function HpReading({ label, health, side }: HpReadingProps) {
  const { t } = useTranslation('NumpadSheet');
  const status = healthStatus(health.hp, health.maxHp);
  const segments = healthSegments(status, health.hp, health.maxHp);
  const current = formatNumber(health.hp);
  const length = `${current}/${health.maxHp}`.length;
  return (
    <div className={classes.reading} data-side={side} data-status={status}>
      <span className={classes.readingLabel}>{label}</span>
      <span
        className={classes.numbers}
        data-part="numbers"
        data-compact={length > 5 || undefined}
        data-long={length > 7 || undefined}
      >
        <span className={classes.current}>{current}</span>
        <span className={classes.max}>/{health.maxHp}</span>
      </span>
      <span className={classes.pips} aria-hidden="true">
        {pipSlots.map((slot) => (
          <span key={slot} className={classes.pip} data-filled={slot < segments || undefined} />
        ))}
      </span>
      <span className={classes.status} data-part="status">
        {t(status)}
      </span>
      {health.tempHp > 0 ? (
        <span className={classes.temp} data-part="temp">
          {t('temp', { amount: health.tempHp })}
        </span>
      ) : null}
    </div>
  );
}

export function NumpadSheet({
  opened,
  name,
  role,
  initiative,
  hp,
  maxHp,
  tempHp,
  history,
  viewer = 'dm',
  onApply,
  onClose,
  'data-tap': tap,
}: NumpadSheetProps) {
  const { t } = useTranslation('NumpadSheet');
  const [amount, setAmount] = useState<number | null>(null);
  const [previewKind, setPreviewKind] = useState<HpHistoryKind>('damage');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [openedBefore, setOpenedBefore] = useState(opened);
  const bodyRef = useRef<HTMLDivElement>(null);
  const appliedRef = useRef(false);
  const motion = useMotion();

  if (opened !== openedBefore) {
    setOpenedBefore(opened);
    if (opened) {
      appliedRef.current = false;
      setAmount(null);
      setPreviewKind('damage');
      setHistoryExpanded(false);
    }
  }

  useEffect(() => {
    if (!historyExpanded) return;
    const scroller = bodyRef.current?.closest<HTMLElement>('[data-sheet-content]');
    scroller?.scrollTo({
      top: scroller.scrollHeight,
      behavior: motion === 'off' ? 'instant' : 'smooth',
    });
  }, [historyExpanded, motion]);

  const append = useCallback((digit: string) => {
    appliedRef.current = false;
    setAmount((current) =>
      current !== null && String(current).length >= amountDigits && current > 0
        ? current
        : (current ?? 0) * 10 + Number(digit),
    );
  }, []);
  const deleteDigit = useCallback(() => {
    appliedRef.current = false;
    setAmount((current) => (current === null || current < 10 ? null : Math.floor(current / 10)));
  }, []);
  const clear = () => {
    appliedRef.current = false;
    setAmount(null);
  };

  useEffect(() => {
    if (!opened) return;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const sheet = bodyRef.current?.closest('[role="dialog"]');
      if (!sheet || !(event.target instanceof Node) || !sheet.contains(event.target)) return;
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        append(event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        deleteDigit();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [opened, append, deleteDigit]);

  const kinds = viewer === 'dm' ? actionKinds : actionKinds.filter((kind) => kind !== 'max');
  const now = { hp, maxHp, tempHp };
  const after = amount === null ? now : hpAfter(now, previewKind, amount);
  const enabled = (kind: HpHistoryKind) => amount !== null && (amount > 0 || kind === 'temp');

  const applyKind = (kind: HpHistoryKind) => {
    if (amount === null || !enabled(kind) || appliedRef.current) return;
    appliedRef.current = true;
    onApply(kind, amount);
    setAmount(null);
    onClose();
  };

  return (
    <Sheet
      opened={opened}
      title={name}
      onClose={onClose}
      header={
        <>
          <span className={classes.role} data-unit-role={role}>
            <span className={classes.initiative}>
              {initiative === null ? '—' : formatNumber(initiative)}
            </span>
            <span className={classes.roleLabel}>{t(role)}</span>
          </span>
          <h2 className={classes.name}>{name}</h2>
        </>
      }
    >
      <div ref={bodyRef} className={classes.body}>
        <div className={classes.preview}>
          <HpReading label={t('now')} health={now} side="now" />
          <IconArrowRight className={classes.arrow} size={32} stroke={2} aria-hidden="true" />
          <HpReading label={t('after')} health={after} side="after" />
        </div>
        <div className={classes.amount}>
          <span className={classes.amountLabel} aria-hidden="true">
            {t('amount')}
          </span>
          <output
            className={classes.amountValue}
            aria-label={t('amount')}
            data-empty={amount === null || undefined}
          >
            {amount ?? 0}
          </output>
          <span className={classes.caret} aria-hidden="true" />
        </div>
        <div className={classes.keys} role="group" aria-label={t('keypad')}>
          {digitKeys.map((digit) => (
            <UnstyledButton
              key={digit}
              component="button"
              type="button"
              className={classes.key}
              onClick={() => append(digit)}
            >
              {digit}
            </UnstyledButton>
          ))}
          <UnstyledButton
            component="button"
            type="button"
            className={classes.key}
            data-kind="clear"
            aria-label={t('clear')}
            onClick={clear}
          >
            C
          </UnstyledButton>
          <UnstyledButton
            component="button"
            type="button"
            className={classes.key}
            onClick={() => append('0')}
          >
            0
          </UnstyledButton>
          <UnstyledButton
            component="button"
            type="button"
            className={classes.key}
            data-kind="delete"
            aria-label={t('delete')}
            onClick={deleteDigit}
          >
            {'<'}
          </UnstyledButton>
        </div>
        <div className={classes.actions}>
          {kinds.map((kind) => (
            <Button
              key={kind}
              className={classes.action}
              data-kind={kind}
              data-tap={tap === kind ? '' : undefined}
              fullWidth
              disabled={!enabled(kind)}
              onPointerEnter={() => setPreviewKind(kind)}
              onFocus={() => setPreviewKind(kind)}
              onClick={() => applyKind(kind)}
            >
              {t(actionLabels[kind])}
            </Button>
          ))}
        </div>
        <HpHistory
          className={classes.history}
          variant="inline"
          entries={history}
          maxHp={maxHp}
          expanded={historyExpanded}
          onToggle={() => setHistoryExpanded((expanded) => !expanded)}
        />
      </div>
    </Sheet>
  );
}
