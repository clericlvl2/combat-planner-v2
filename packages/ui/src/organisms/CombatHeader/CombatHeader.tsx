import { LIMITS } from '@combat-planner/domain';
import { Popover, UnstyledButton } from '@mantine/core';
import {
  IconArrowBackUp,
  IconChevronLeft,
  IconDots,
  IconRefresh,
  IconShare,
  IconSwitchHorizontal,
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

export type CombatHeaderViewer = 'dm' | 'player';

export interface CombatHeaderProps extends Omit<
  ComponentPropsWithoutRef<'header'>,
  'children' | 'title'
> {
  title: string;
  round: number | null;
  escalation: EscalationValue;
  viewer?: CombatHeaderViewer;
  open?: CombatHeaderPopover | null;
  onBack?: () => void;
  onRound?: () => void;
  onEscalation?: () => void;
  onMenu: () => void;
  onClose: () => void;
  onRoundChange?: (round: number) => void;
  onEscalationChange?: (value: EscalationValue) => void;
  onMenuSelect?: (action: CombatMenuAction) => void;
  onHeroes?: () => void;
  undoDisabled?: boolean;
}

const MENU_WIDTH = 240;

const ROUND_WIDTH = 240;

const POPOVER_OFFSET = 8;

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
      offset={POPOVER_OFFSET}
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
  viewer = 'dm',
  open = null,
  onBack,
  onRound,
  onEscalation,
  onMenu,
  onClose,
  onRoundChange,
  onEscalationChange,
  onMenuSelect,
  onHeroes,
  undoDisabled = false,
  className,
  ...rest
}: CombatHeaderProps) {
  const { t } = useTranslation('CombatHeader');
  const roundRef = useRef<HTMLButtonElement | null>(null);
  const escalationRef = useRef<HTMLButtonElement | null>(null);
  const discardRoundRef = useRef(false);
  const setup = round === null;
  const player = viewer === 'player';
  const editRound = player ? undefined : onRound;
  const editEscalation = player ? undefined : onEscalation;
  const roundOpen = !setup && open === 'round';
  const escalationOpen = !setup && open === 'escalation';
  const menuOpen = open === 'menu';

  const items: MenuItem[] = player
    ? [{ id: 'heroes', icon: IconSwitchHorizontal, label: t('heroes') }]
    : [
        { id: 'addUnit', icon: IconUserPlus, label: t('addUnit') },
        { id: 'undo', icon: IconArrowBackUp, label: t('undo'), disabled: undoDisabled },
        { id: 'share', icon: IconShare, label: t('share') },
        ...(setup
          ? []
          : [{ id: 'restart', icon: IconRefresh, label: t('restart'), divider: true }]),
        { id: 'clear', icon: IconTrash, label: t('clear'), tone: 'danger', divider: setup },
      ];

  const selectItem = (id: string) => {
    if (player) onHeroes?.();
    else onMenuSelect?.(id as CombatMenuAction);
  };

  useEffect(() => {
    if (roundOpen) discardRoundRef.current = false;
  }, [roundOpen]);

  const handleRoundKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    onClose();
    focusSource(roundRef.current);
  };

  const roundContent = (
    <>
      <span className={classes.caption}>{t('round')}</span>{' '}
      <span className={classes.number}>{round}</span>
    </>
  );

  const escalationContent = (
    <>
      <EscalationDie className={classes.ticketDie} value={escalation} readOnly aria-hidden="true" />
      <span className={classes.stack}>
        <span className={classes.caption}>{t('escalationCaption')}</span>{' '}
        <span className={classes.number}>+{escalation}</span>
      </span>
    </>
  );

  const roundCell = editRound ? (
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
          className={`${classes.cell} ${classes.roundCell}`}
          aria-label={t('editRound', { round })}
          aria-haspopup="dialog"
          aria-expanded={roundOpen}
          data-open={roundOpen || undefined}
          onClick={() => editRound()}
        >
          {roundContent}
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
    <div className={`${classes.cell} ${classes.roundCell}`}>{roundContent}</div>
  );

  const escalationCell = editEscalation ? (
    <HeaderPopover
      opened={escalationOpen}
      position="bottom-end"
      sourceRef={escalationRef}
      initialFocus="button[data-selected]"
      label={t('escalationTitle')}
      onClose={onClose}
      target={
        <UnstyledButton
          ref={escalationRef}
          component="button"
          type="button"
          className={`${classes.cell} ${classes.escalationCell}`}
          aria-label={t('setEscalation', { value: escalation })}
          aria-haspopup="dialog"
          aria-expanded={escalationOpen}
          data-open={escalationOpen || undefined}
          onClick={() => editEscalation()}
        >
          {escalationContent}
        </UnstyledButton>
      }
    >
      <PopoverFrame title={t('escalationTitle')} className={classes.escalationPanel}>
        <FacePicker
          value={escalation}
          onPick={(value) => {
            onEscalationChange?.(value);
            onClose();
            focusSource(escalationRef.current);
          }}
        />
        <span className={classes.escalationHint}>
          {t('escalationHint', { max: LIMITS.escalation.max })}
        </span>
      </PopoverFrame>
    </HeaderPopover>
  ) : (
    <div className={`${classes.cell} ${classes.escalationCell}`}>{escalationContent}</div>
  );

  return (
    <header {...rest} className={className ? `${classes.root} ${className}` : classes.root}>
      <div className={classes.statusBar} aria-hidden="true" />
      <div className={classes.bar} data-back={onBack ? '' : undefined}>
        {onBack ? (
          <IconButton
            className={classes.back}
            variant="plain"
            icon={IconChevronLeft}
            aria-label={t('back')}
            onClick={() => onBack()}
          />
        ) : null}
        <h1 className={classes.title} data-ellipsis="">
          {title}
        </h1>
        <Menu
          opened={menuOpen}
          width={MENU_WIDTH}
          aria-label={player ? t('playerMenuLabel') : t('menuLabel')}
          items={items}
          onSelect={selectItem}
          onClose={() => onClose()}
          target={
            <UnstyledButton
              component="button"
              type="button"
              className={classes.menu}
              aria-label={t('menu')}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => onMenu()}
            >
              <IconDots size={24} stroke={2} aria-hidden="true" />
            </UnstyledButton>
          }
        />
      </div>
      <div className={classes.ticket} data-setup={setup || undefined}>
        {setup ? (
          <div className={classes.setup}>{t('setup')}</div>
        ) : (
          <>
            {roundCell}
            <span className={classes.divider} aria-hidden="true" />
            {escalationCell}
          </>
        )}
      </div>
    </header>
  );
}
