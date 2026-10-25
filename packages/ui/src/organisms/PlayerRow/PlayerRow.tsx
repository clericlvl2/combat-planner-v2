import type { PlayerUnit } from '@combat-planner/domain';
import { UnstyledButton } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useId } from 'react';
import type { HTMLAttributes, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleBlock } from '../../atoms/RoleBlock/RoleBlock.tsx';
import { Chip } from '../../atoms/Chip/Chip.tsx';
import { CardActions } from '../../molecules/CardActions/CardActions.tsx';
import { DefenseLine } from '../../molecules/DefenseLine/DefenseLine.tsx';
import type { HpChange } from '../../hooks/useHpChanges.ts';
import { useHpMotionReduced } from '../../hooks/useHpChanges.ts';
import { HpBox } from '../../molecules/HpBox/HpBox.tsx';
import { HpChangeOverlay } from '../../molecules/HpChangeOverlay/HpChangeOverlay.tsx';
import { NoteField } from '../../molecules/NoteField/NoteField.tsx';
import { Reveal } from '../../motion/Reveal.tsx';
import { iconSizes } from '../../theme.ts';
import classes from './PlayerRow.module.css';

export interface PlayerRowProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onToggle'
> {
  unit: PlayerUnit;
  mine?: boolean;
  expanded?: boolean;
  active?: boolean;
  setup?: boolean;
  conditionsOpen?: boolean;
  moreOpen?: boolean;
  busy?: boolean;
  hpChange?: HpChange;
  onToggle: () => void;
  onInitiative: (event: MouseEvent<HTMLButtonElement>) => void;
  onHp: () => void;
  onConditions: () => void;
  onDefenses?: () => void;
  onHistory: () => void;
  onNoteChange: (note: string) => void;
  onEdit: () => void;
  onMore: (event: MouseEvent<HTMLButtonElement>) => void;
}

const INTERACTIVE = 'button, a, input, textarea, select, [role="button"], [data-part="details"]';

export function PlayerRow({
  unit,
  mine: mineProp = false,
  expanded: expandedProp = false,
  active = false,
  setup = false,
  conditionsOpen = false,
  moreOpen = false,
  busy = false,
  hpChange,
  onToggle,
  onInitiative,
  onHp,
  onConditions,
  onDefenses,
  onHistory,
  onNoteChange,
  onEdit,
  onMore,
  className,
  onClick,
  ...rest
}: PlayerRowProps) {
  const { t } = useTranslation('PlayerRow');
  const detailsId = useId();
  const reduced = useHpMotionReduced();
  const friendly = unit.role !== 'enemy';
  const mine = friendly && mineProp;
  const expanded = mine && expandedProp;
  const dead = unit.healthStatus === 'dead';
  const shownActive = active && !setup;
  const conditions = setup ? [] : unit.conditions;
  const numbers =
    friendly && unit.hp !== undefined && unit.maxHp !== undefined
      ? { hp: unit.hp, maxHp: unit.maxHp, tempHp: unit.tempHp ?? 0 }
      : null;
  const defenses =
    friendly && unit.ac !== undefined && unit.pd !== undefined && unit.md !== undefined
      ? {
          ac: unit.ac,
          pd: unit.pd,
          md: unit.md,
          acMod: unit.acMod ?? 0,
          pdMod: unit.pdMod ?? 0,
          mdMod: unit.mdMod ?? 0,
        }
      : null;
  const claimName = friendly ? (unit.claimedByName ?? undefined) : undefined;
  const note = mine ? (unit.note ?? '') : '';
  const collapsedNote = mine && !expanded && note !== '';

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (!mine || event.defaultPrevented) return;
    if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
    onToggle();
  };

  return (
    <div
      {...rest}
      className={className ? `${classes.root} ${className}` : classes.root}
      data-mine={mine || undefined}
      data-active={shownActive || undefined}
      data-expanded={expanded || undefined}
      data-dead={dead || undefined}
      data-unit-role={unit.role}
      onClick={handleClick}
    >
      <RoleBlock
        className={classes.role}
        fill
        tile
        unitRole={unit.role}
        top={unit.initiative === null ? null : { kind: 'initiative', value: unit.initiative }}
        active={shownActive}
        editable={mine}
        mine={mine}
        dead={dead}
        data-tour="initiative"
        onClick={mine ? onInitiative : undefined}
      />
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
        {defenses ? <DefenseLine {...defenses} /> : null}
        {conditions.length > 0 ? (
          <span className={classes.conditions} role="list" aria-label={t('conditions')}>
            {conditions.map((condition) => (
              <Chip key={condition} role="listitem" condition={condition} size="S">
                {t(condition)}
              </Chip>
            ))}
          </span>
        ) : null}
        <Reveal open={collapsedNote} className={classes.noteSlot}>
          <NoteField value={note} onChange={onNoteChange} collapsed />
        </Reveal>
      </div>
      {mine ? (
        <UnstyledButton
          component="button"
          type="button"
          className={classes.toggle}
          data-tour="toggle"
          aria-label={unit.name}
          aria-expanded={expanded}
          aria-controls={expanded ? detailsId : undefined}
          onClick={() => onToggle()}
        />
      ) : null}
      <div className={classes.hp}>
        {numbers ? (
          <HpBox
            data-tour="hp"
            viewer="player"
            hp={numbers.hp}
            maxHp={numbers.maxHp}
            role={unit.role}
            tempHp={numbers.tempHp}
            mine={mine}
            count={!reduced}
            onClick={mine ? () => onHp() : undefined}
          />
        ) : (
          <HpBox viewer="player" status={unit.healthStatus} />
        )}
      </div>
      {hpChange ? (
        <HpChangeOverlay
          key={hpChange.key}
          change={hpChange}
          showNumber={numbers !== null}
          reduced={reduced}
        />
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
              onClick={() => onConditions()}
            >
              <span className={classes.triggerLabel}>{t('conditions')}</span>
              {conditionsOpen ? (
                <IconChevronUp size={iconSizes.M} stroke={2} aria-hidden="true" />
              ) : (
                <IconChevronDown size={iconSizes.M} stroke={2} aria-hidden="true" />
              )}
            </UnstyledButton>
            <UnstyledButton
              component="button"
              type="button"
              className={classes.trigger}
              aria-haspopup="dialog"
              onClick={() => onHistory()}
            >
              <span className={classes.triggerLabel}>{t('hpHistory')}</span>
              <IconChevronDown size={iconSizes.M} stroke={2} aria-hidden="true" />
            </UnstyledButton>
            {onDefenses ? (
              <UnstyledButton
                component="button"
                type="button"
                className={`${classes.trigger} ${classes.wideTrigger}`}
                aria-haspopup="dialog"
                onClick={() => onDefenses()}
              >
                <span className={classes.triggerLabel}>{t('defenses')}</span>
                <IconChevronDown size={iconSizes.M} stroke={2} aria-hidden="true" />
              </UnstyledButton>
            ) : null}
          </div>
          <NoteField value={note} onChange={onNoteChange} />
          <CardActions open={moreOpen} busy={busy} onEdit={onEdit} onMore={onMore} />
        </div>
      </Reveal>
    </div>
  );
}
