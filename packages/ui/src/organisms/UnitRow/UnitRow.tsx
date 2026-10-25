import { healthStatus } from '@combat-planner/domain';
import type { Unit } from '@combat-planner/domain';
import { UnstyledButton } from '@mantine/core';
import {
  IconBookmark,
  IconChevronDown,
  IconCopy,
  IconPlayerPause,
  IconPlayerPlay,
  IconUserMinus,
  IconUserOff,
} from '@tabler/icons-react';
import { useId, useRef } from 'react';
import type { HTMLAttributes, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Chip } from '../../atoms/Chip/Chip.tsx';
import { RoleBlock } from '../../atoms/RoleBlock/RoleBlock.tsx';
import { CardActions } from '../../molecules/CardActions/CardActions.tsx';
import { DefenseLine } from '../../molecules/DefenseLine/DefenseLine.tsx';
import type { HpChange } from '../../hooks/useHpChanges.ts';
import { useHpMotionReduced } from '../../hooks/useHpChanges.ts';
import { HpBox } from '../../molecules/HpBox/HpBox.tsx';
import { HpChangeOverlay } from '../../molecules/HpChangeOverlay/HpChangeOverlay.tsx';
import { InitiativePopover } from '../../molecules/InitiativePopover/InitiativePopover.tsx';
import { NoteField } from '../../molecules/NoteField/NoteField.tsx';
import { Reveal } from '../../motion/Reveal.tsx';
import { Menu } from '../Menu/Menu.tsx';
import type { MenuItem } from '../Menu/Menu.tsx';
import { iconSizes } from '../../theme.ts';
import classes from './UnitRow.module.css';

export type UnitRowTarget =
  | 'initiative'
  | 'hp'
  | 'conditions'
  | 'history'
  | 'defenses'
  | 'note'
  | 'edit'
  | 'more';

export interface UnitRowCallbacks {
  onToggle: () => void;
  onInitiative: () => void;
  onInitiativeSet: (initiative: number) => void;
  onInitiativeRoll: (initiative: number, roll: number) => void;
  onInitiativeClose: () => void;
  onHp: () => void;
  onConditions: () => void;
  onDefenses: () => void;
  onHistory: () => void;
  onNoteChange: (note: string) => void;
  onEdit: () => void;
  onMore: () => void;
  onMenuClose: () => void;
  onDuplicate: () => void;
  onSetDisabled: (disabled: boolean) => void;
  onSaveAsPreset: () => void;
  onReleaseClaim: () => void;
  onRemove: () => void;
}

interface UnitRowBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onToggle'> {
  unit: Unit;
  claimedByName?: string;
  active?: boolean;
  expanded?: boolean;
  hpChange?: HpChange;
  initiativeOpen?: boolean;
  conditionsOpen?: boolean;
  historyOpen?: boolean;
  defensesOpen?: boolean;
  menuOpen?: boolean;
  busy?: boolean;
  duplicateDisabled?: boolean;
  random?: () => number;
  'data-tap'?: UnitRowTarget;
}

export type UnitRowProps = UnitRowBaseProps &
  (({ readOnly?: false } & UnitRowCallbacks) | ({ readOnly: true } & Partial<UnitRowCallbacks>));

const noop = () => undefined;

const INTERACTIVE =
  'button, a, input, textarea, select, [role="button"], [role="dialog"], [role="menu"], [data-part="details"]';

const MENU_WIDTH = 240;

export function UnitRow({
  unit,
  claimedByName,
  active = false,
  expanded: expandedProp = false,
  hpChange,
  readOnly = false,
  initiativeOpen = false,
  conditionsOpen = false,
  historyOpen = false,
  defensesOpen = false,
  menuOpen = false,
  busy = false,
  duplicateDisabled = false,
  random,
  onToggle,
  onInitiative,
  onInitiativeSet,
  onInitiativeRoll,
  onInitiativeClose,
  onHp,
  onConditions,
  onDefenses,
  onHistory,
  onNoteChange,
  onEdit,
  onMore,
  onMenuClose,
  onDuplicate,
  onSetDisabled,
  onSaveAsPreset,
  onReleaseClaim,
  onRemove,
  'data-tap': tap,
  className,
  onClick,
  ...rest
}: UnitRowProps) {
  const { t } = useTranslation('UnitRow');
  const detailsId = useId();
  const reduced = useHpMotionReduced();
  const roleCellRef = useRef<HTMLDivElement>(null);
  const initiativeRef = useRef<HTMLDivElement>(null);
  const expanded = !readOnly && expandedProp;
  const showInitiative = !readOnly && initiativeOpen;
  const dead = healthStatus(unit.hp, unit.maxHp, unit.role) === 'dead';
  const disabled = unit.disabled;
  const claimName = unit.claimedBy ? claimedByName : undefined;

  const tapOf = (target: UnitRowTarget) => (tap === target ? '' : undefined);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (readOnly || event.defaultPrevented) return;
    if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
    onToggle?.();
  };

  const closeInitiative = () => {
    const focusInside = initiativeRef.current?.contains(document.activeElement) === true;
    onInitiativeClose?.();
    if (focusInside) roleCellRef.current?.querySelector('button')?.focus();
  };

  const menuItems: (MenuItem & { run: () => void })[] = [
    {
      id: 'duplicate',
      icon: IconCopy,
      label: t('duplicate'),
      disabled: duplicateDisabled,
      run: () => onDuplicate?.(),
    },
    disabled
      ? {
          id: 'enable',
          icon: IconPlayerPlay,
          label: t('enable'),
          run: () => onSetDisabled?.(false),
        }
      : {
          id: 'disable',
          icon: IconPlayerPause,
          label: t('disable'),
          run: () => onSetDisabled?.(true),
        },
    {
      id: 'saveAsPreset',
      icon: IconBookmark,
      label: t('saveAsPreset'),
      run: () => onSaveAsPreset?.(),
    },
    {
      id: 'releaseClaim',
      icon: IconUserOff,
      label: t('releaseClaim'),
      disabled: unit.claimedBy === null,
      run: () => onReleaseClaim?.(),
    },
    {
      id: 'remove',
      icon: IconUserMinus,
      label: t('remove'),
      tone: 'danger',
      divider: true,
      run: () => onRemove?.(),
    },
  ];

  return (
    <div
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      data-active={active || undefined}
      data-expanded={expanded || undefined}
      data-dead={dead || undefined}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      data-unit-role={unit.role}
      onClick={handleClick}
    >
      <div ref={roleCellRef} className={classes.roleCell}>
        <RoleBlock
          className={classes.role}
          fill
          tile
          unitRole={unit.role}
          top={unit.initiative === null ? null : { kind: 'initiative', value: unit.initiative }}
          active={active}
          editable={!readOnly}
          dead={dead}
          disabled={disabled}
          aria-label={readOnly ? undefined : t('rollInitiative')}
          aria-haspopup={readOnly ? undefined : 'dialog'}
          aria-expanded={readOnly ? undefined : showInitiative}
          data-tap={tapOf('initiative')}
          onClick={
            readOnly ? undefined : () => (showInitiative ? closeInitiative() : onInitiative?.())
          }
        />
        {showInitiative ? (
          <div ref={initiativeRef} className={classes.initiative}>
            <InitiativePopover
              open
              value={unit.initiative}
              bonus={unit.initiativeBonus}
              random={random}
              triggerRef={roleCellRef}
              onSet={onInitiativeSet ?? noop}
              onRoll={onInitiativeRoll ?? noop}
              onClose={closeInitiative}
            />
          </div>
        ) : null}
      </div>
      <div className={classes.main}>
        <span className={classes.nameLine}>
          <span className={classes.name} data-part="name">
            {unit.name}
          </span>
          {claimName ? (
            <>
              {' '}
              <span className={classes.claimer}>@{claimName}</span>
            </>
          ) : null}
        </span>
        <DefenseLine
          ac={unit.ac}
          pd={unit.pd}
          md={unit.md}
          acMod={unit.acMod}
          pdMod={unit.pdMod}
          mdMod={unit.mdMod}
        />
        {unit.conditions.length > 0 ? (
          <span className={classes.conditions} role="list" aria-label={t('conditions')}>
            {unit.conditions.map((condition) => (
              <Chip key={condition} role="listitem" condition={condition} size="S">
                {t(condition)}
              </Chip>
            ))}
          </span>
        ) : null}
        <Reveal open={!expanded && unit.note !== ''} className={classes.noteSlot}>
          <NoteField value={unit.note} onChange={onNoteChange ?? noop} collapsed />
        </Reveal>
      </div>
      {readOnly ? null : (
        <UnstyledButton
          component="button"
          type="button"
          className={classes.toggle}
          aria-label={unit.name}
          aria-expanded={expanded}
          aria-controls={expanded ? detailsId : undefined}
          onClick={() => onToggle?.()}
        />
      )}
      <div className={classes.hp}>
        <HpBox
          viewer="dm"
          hp={unit.hp}
          maxHp={unit.maxHp}
          role={unit.role}
          tempHp={unit.tempHp}
          disabled={disabled}
          count={!reduced}
          data-tap={tapOf('hp')}
          onClick={readOnly ? undefined : () => onHp?.()}
        />
      </div>
      {hpChange ? (
        <HpChangeOverlay key={hpChange.key} change={hpChange} showNumber reduced={reduced} />
      ) : null}
      <Reveal open={expanded} className={classes.detailsSlot}>
        <div id={detailsId} className={classes.details} data-part="details">
          <div className={classes.triggers}>
            <UnstyledButton
              component="button"
              type="button"
              className={classes.trigger}
              aria-haspopup="dialog"
              aria-expanded={conditionsOpen}
              data-open={conditionsOpen || undefined}
              data-tap={tapOf('conditions')}
              onClick={() => onConditions?.()}
            >
              <span className={classes.triggerLabel}>{t('conditions')}</span>
              <IconChevronDown size={iconSizes.M} stroke={2} aria-hidden="true" />
            </UnstyledButton>
            <UnstyledButton
              component="button"
              type="button"
              className={classes.trigger}
              aria-haspopup="dialog"
              aria-expanded={historyOpen}
              data-open={historyOpen || undefined}
              data-tap={tapOf('history')}
              onClick={() => onHistory?.()}
            >
              <span className={classes.triggerLabel}>{t('hpHistory')}</span>
              <IconChevronDown size={iconSizes.M} stroke={2} aria-hidden="true" />
            </UnstyledButton>
            <UnstyledButton
              component="button"
              type="button"
              className={`${classes.trigger} ${classes.wideTrigger}`}
              aria-haspopup="dialog"
              aria-expanded={defensesOpen}
              data-open={defensesOpen || undefined}
              data-tap={tapOf('defenses')}
              onClick={() => onDefenses?.()}
            >
              <span className={classes.triggerLabel}>{t('defenses')}</span>
              <IconChevronDown size={iconSizes.M} stroke={2} aria-hidden="true" />
            </UnstyledButton>
          </div>
          <NoteField value={unit.note} onChange={onNoteChange ?? noop} data-tap={tapOf('note')} />
          <Menu
            opened={menuOpen}
            width={MENU_WIDTH}
            aria-label={t('menuLabel', { name: unit.name })}
            items={menuItems}
            onSelect={(id) => menuItems.find((item) => item.id === id)?.run()}
            onClose={() => onMenuClose?.()}
            target={
              <CardActions
                open={menuOpen}
                busy={busy}
                data-tap={tap === 'edit' || tap === 'more' ? tap : undefined}
                onEdit={() => onEdit?.()}
                onMore={() => onMore?.()}
              />
            }
          />
        </div>
      </Reveal>
    </div>
  );
}
