import { LIMITS } from '@combat-planner/domain';
import { Popover, UnstyledButton } from '@mantine/core';
import {
  IconArrowBackUp,
  IconChevronLeft,
  IconDots,
  IconRefresh,
  IconShare,
  IconTrash,
  IconUserPlus,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef } from 'react';
import type {
  ComponentPropsWithoutRef,
  FocusEvent,
  KeyboardEvent,
  ReactElement,
  ReactNode,
  RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import { EscalationDie } from '../../atoms/EscalationDie/EscalationDie.tsx';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import { IconButton } from '../../atoms/IconButton/IconButton.tsx';
import { Stepper } from '../../molecules/Stepper/Stepper.tsx';
import { Menu, PopoverFrame } from '../Menu/Menu.tsx';
import type { MenuItem } from '../Menu/Menu.tsx';
import classes from './CombatHeader.module.css';

export type CombatHeaderPopover = 'round' | 'escalation' | 'menu';

export type CombatMenuAction = 'addUnit' | 'undo' | 'share' | 'restart' | 'clear';

export interface CombatHeaderProps extends Omit<
  ComponentPropsWithoutRef<'header'>,
  'children' | 'title'
> {
  title: string;
  round: number | null;
  escalation: EscalationValue;
  open?: CombatHeaderPopover | null;
  onBack: () => void;
  onRound?: () => void;
  onEscalation?: () => void;
  onMenu: () => void;
  onClose: () => void;
  onRoundChange?: (round: number) => void;
  onEscalationChange?: (value: EscalationValue) => void;
  onMenuSelect: (action: CombatMenuAction) => void;
  undoDisabled?: boolean;
}

const MENU_WIDTH = 240;

const ROUND_WIDTH = 240;

const POPOVER_OFFSET = 8;

const ESCALATION_SHIFT = 62;

const FOCUS_FRAMES = 30;

const escalationValues = Array.from(
  { length: LIMITS.escalation.max - LIMITS.escalation.min + 1 },
  (_, index) => (LIMITS.escalation.min + index) as EscalationValue,
);

function focusWhenReady(panel: HTMLElement, selector: string, framesLeft: number) {
  const node = panel.querySelector<HTMLElement>(selector);
  if (!node || !panel.isConnected) return;
  node.focus({ preventScroll: true });
  if (document.activeElement !== node && framesLeft > 0) {
    requestAnimationFrame(() => focusWhenReady(panel, selector, framesLeft - 1));
  }
}

function focusSource(source: HTMLElement | null) {
  if (!source) return;
  const button = source.matches('button') ? source : source.querySelector('button');
  button?.focus();
}

interface HeaderPopoverProps {
  opened: boolean;
  position: 'bottom-start' | 'bottom-end';
  crossShift?: number;
  sourceRef: RefObject<HTMLElement | null>;
  initialFocus: string;
  label: string;
  onClose: () => void;
  onEscape?: () => void;
  target: ReactElement;
  children: ReactNode;
}

function HeaderPopover({
  opened,
  position,
  crossShift = 0,
  sourceRef,
  initialFocus,
  label,
  onClose,
  onEscape,
  target,
  children,
}: HeaderPopoverProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!opened) return;
    closedRef.current = false;
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (panelRef.current?.contains(event.target)) return;
      if (sourceRef.current?.contains(event.target)) return;
      close();
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const active = document.activeElement;
      const inPanel = panelRef.current?.contains(active) === true;
      const onSource = sourceRef.current?.contains(active) === true;
      if (!inPanel && !onSource) return;
      event.preventDefault();
      event.stopPropagation();
      onEscapeRef.current?.();
      close();
      focusSource(sourceRef.current);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [opened, sourceRef, close]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (!opened) return;
    if (!(next instanceof Node)) {
      setTimeout(() => {
        const panel = panelRef.current;
        if (!panel?.isConnected || closedRef.current) return;
        if (document.activeElement !== document.body) return;
        panel.querySelector<HTMLElement>(initialFocus)?.focus({ preventScroll: true });
      });
      return;
    }
    if (panelRef.current?.contains(next)) return;
    if (sourceRef.current?.contains(next)) return;
    close();
  };

  const setPanel = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      if (node) focusWhenReady(node, initialFocus, FOCUS_FRAMES);
    },
    [initialFocus],
  );

  return (
    <Popover
      opened={opened}
      position={position}
      offset={{ mainAxis: POPOVER_OFFSET, crossAxis: crossShift }}
      withRoles={false}
      withinPortal={false}
      closeOnEscape={false}
      closeOnClickOutside={false}
      middlewares={{ flip: false, shift: false }}
    >
      <Popover.Target>{target}</Popover.Target>
      <Popover.Dropdown className={classes.dropdown}>
        <div
          ref={setPanel}
          role="dialog"
          aria-label={label}
          className={classes.panelHost}
          onBlur={handleBlur}
        >
          {children}
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}

interface FacePickerProps {
  value: EscalationValue;
  onPick: (value: EscalationValue) => void;
}

function FacePicker({ value, onPick }: FacePickerProps) {
  const { t } = useTranslation('CombatHeader');
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-face]')];
    const current = keys.findIndex((node) => node === document.activeElement);
    if (current < 0) return;
    const last = keys.length - 1;
    let next: number;
    if (event.key === 'ArrowRight') next = current === last ? 0 : current + 1;
    else if (event.key === 'ArrowLeft') next = current === 0 ? last : current - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    keys[next]?.focus();
  };
  return (
    <div
      className={classes.faces}
      role="group"
      aria-label={t('escalationTitle')}
      onKeyDown={handleKeyDown}
    >
      {escalationValues.map((face) => {
        const selected = face === value;
        return (
          <UnstyledButton
            key={face}
            component="button"
            type="button"
            className={classes.face}
            data-face={face}
            data-selected={selected || undefined}
            aria-pressed={selected}
            aria-label={t('escalationFace', { value: face })}
            onClick={() => onPick(face)}
          >
            <EscalationDie className={classes.faceDie} value={face} readOnly aria-hidden="true" />
          </UnstyledButton>
        );
      })}
    </div>
  );
}

export function CombatHeader({
  title,
  round,
  escalation,
  open = null,
  onBack,
  onRound,
  onEscalation,
  onMenu,
  onClose,
  onRoundChange,
  onEscalationChange,
  onMenuSelect,
  undoDisabled = false,
  className,
  ...rest
}: CombatHeaderProps) {
  const { t } = useTranslation('CombatHeader');
  const roundRef = useRef<HTMLButtonElement | null>(null);
  const dieRef = useRef<HTMLSpanElement | null>(null);
  const discardRoundRef = useRef(false);
  const setup = round === null;
  const roundOpen = !setup && open === 'round';
  const escalationOpen = !setup && open === 'escalation';
  const menuOpen = open === 'menu';

  const items: MenuItem[] = [
    { id: 'addUnit', icon: IconUserPlus, label: t('addUnit') },
    { id: 'undo', icon: IconArrowBackUp, label: t('undo'), disabled: undoDisabled },
    { id: 'share', icon: IconShare, label: t('share') },
    ...(setup ? [] : [{ id: 'restart', icon: IconRefresh, label: t('restart'), divider: true }]),
    { id: 'clear', icon: IconTrash, label: t('clear'), tone: 'danger', divider: setup },
  ];

  useEffect(() => {
    if (roundOpen) discardRoundRef.current = false;
  }, [roundOpen]);

  const handleRoundKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    onClose();
    focusSource(roundRef.current);
  };

  const roundLabel = (
    <>
      <span>{t('round')}</span> <span className={classes.roundNumber}>{round}</span>
    </>
  );

  return (
    <header {...rest} className={className ? `${classes.root} ${className}` : classes.root}>
      <div className={classes.statusBar} aria-hidden="true" />
      <div className={classes.body}>
        <IconButton
          className={classes.back}
          variant="plain"
          icon={IconChevronLeft}
          aria-label={t('back')}
          onClick={() => onBack()}
        />
        <div className={classes.text}>
          <h1 className={classes.title}>{title}</h1>
          <div className={classes.main}>
            {setup ? (
              t('setup')
            ) : onRound ? (
              <HeaderPopover
                opened={roundOpen}
                position="bottom-start"
                sourceRef={roundRef}
                initialFocus='input[role="spinbutton"]'
                label={t('round')}
                onClose={onClose}
                onEscape={() => {
                  discardRoundRef.current = true;
                }}
                target={
                  <UnstyledButton
                    ref={roundRef}
                    component="button"
                    type="button"
                    className={classes.round}
                    aria-label={t('editRound', { round })}
                    aria-haspopup="dialog"
                    aria-expanded={roundOpen}
                    data-open={roundOpen || undefined}
                    onClick={() => onRound()}
                  >
                    {roundLabel}
                  </UnstyledButton>
                }
              >
                <PopoverFrame title={t('round')} width={ROUND_WIDTH} onKeyDown={handleRoundKeyDown}>
                  <Stepper
                    value={round}
                    min={LIMITS.round.min}
                    max={LIMITS.round.max}
                    signed={false}
                    onChange={(next) => {
                      if (!discardRoundRef.current) onRoundChange?.(next);
                    }}
                  />
                  <span className={classes.roundHint}>{t('roundHint', LIMITS.round)}</span>
                </PopoverFrame>
              </HeaderPopover>
            ) : (
              <span className={classes.roundStatic}>{roundLabel}</span>
            )}
          </div>
        </div>
        {setup ? null : onEscalation ? (
          <HeaderPopover
            opened={escalationOpen}
            position="bottom-end"
            crossShift={ESCALATION_SHIFT}
            sourceRef={dieRef}
            initialFocus="button[data-selected]"
            label={t('escalationTitle')}
            onClose={onClose}
            target={
              <span ref={dieRef} className={classes.dieSlot}>
                <EscalationDie
                  value={escalation}
                  aria-label={t('setEscalation', { value: escalation })}
                  aria-haspopup="dialog"
                  aria-expanded={escalationOpen}
                  data-open={escalationOpen || undefined}
                  data-tap={escalationOpen || undefined}
                  onClick={() => onEscalation()}
                />
              </span>
            }
          >
            <PopoverFrame title={t('escalationTitle')}>
              <FacePicker
                value={escalation}
                onPick={(value) => {
                  onEscalationChange?.(value);
                  onClose();
                  focusSource(dieRef.current);
                }}
              />
              <span className={classes.escalationHint}>
                {t('escalationHint', { max: LIMITS.escalation.max })}
              </span>
            </PopoverFrame>
          </HeaderPopover>
        ) : (
          <EscalationDie value={escalation} readOnly />
        )}
        <Menu
          opened={menuOpen}
          width={MENU_WIDTH}
          aria-label={t('menuLabel')}
          items={items}
          onSelect={(id) => onMenuSelect(id as CombatMenuAction)}
          onClose={() => onClose()}
          target={
            <UnstyledButton
              component="button"
              type="button"
              className={classes.menu}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => onMenu()}
            >
              <span className={classes.tile} aria-hidden="true">
                <IconDots size={24} stroke={2} />
              </span>
              <span className={classes.caption}>{t('menu')}</span>
            </UnstyledButton>
          }
        />
      </div>
    </header>
  );
}
