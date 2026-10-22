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
import { HpBox } from '../../molecules/HpBox/HpBox.tsx';
import { NoteField } from '../../molecules/NoteField/NoteField.tsx';
import classes from './PlayerRow.module.css';

export type PlayerRowTarget = 'initiative' | 'hp' | 'conditions' | 'history' | 'note';

export interface PlayerRowProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onToggle'
> {
  unit: PlayerUnit;
  mine?: boolean;
  expanded?: boolean;
  claimedByName?: string;
  active?: boolean;
  setup?: boolean;
  conditionsOpen?: boolean;
  moreOpen?: boolean;
  flash?: boolean;
  onToggle: () => void;
  onInitiative: (event: MouseEvent<HTMLButtonElement>) => void;
  onHp: () => void;
  onConditions: () => void;
  onHistory: () => void;
  onNoteChange: (note: string) => void;
  onEdit: () => void;
  onMore: (event: MouseEvent<HTMLButtonElement>) => void;
  'data-tap'?: PlayerRowTarget;
}

const INTERACTIVE = 'button, a, input, textarea, select, [role="button"], [data-part="details"]';

export function PlayerRow({
  unit,
  mine: mineProp = false,
  expanded: expandedProp = false,
  claimedByName,
  active = false,
  setup = false,
  conditionsOpen = false,
  moreOpen = false,
  flash = false,
  onToggle,
  onInitiative,
  onHp,
  onConditions,
  onHistory,
  onNoteChange,
  onEdit,
  onMore,
  'data-tap': tap,
  className,
  onClick,
  ...rest
}: PlayerRowProps) {
  const { t } = useTranslation('PlayerRow');
  const detailsId = useId();
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
      ? { ac: unit.ac, pd: unit.pd, md: unit.md }
      : null;
  const claimName = friendly && unit.claimedBy ? claimedByName : undefined;
  const note = mine ? (unit.note ?? '') : '';
  const collapsedNote = mine && !expanded && note !== '';

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (!mine || event.defaultPrevented) return;
    if (event.target instanceof Element && event.target.closest(INTERACTIVE)) return;
    onToggle();
  };

  const tapOf = (target: PlayerRowTarget) => (tap === target ? '' : undefined);

  return (
    <div
      data-flash={flash || undefined}
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
        unitRole={unit.role}
        top={unit.initiative === null ? null : { kind: 'initiative', value: unit.initiative }}
        active={shownActive}
        editable={mine}
        mine={mine}
        dead={dead}
        data-tap={tapOf('initiative')}
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
        {defenses ? <DefenseLine ac={defenses.ac} pd={defenses.pd} md={defenses.md} /> : null}
        {conditions.length > 0 ? (
          <span className={classes.conditions} role="list" aria-label={t('conditions')}>
            {conditions.map((condition) => (
              <Chip key={condition} role="listitem" condition={condition} size="S">
                {t(condition)}
              </Chip>
            ))}
          </span>
        ) : null}
        {collapsedNote ? <NoteField value={note} onChange={onNoteChange} collapsed /> : null}
      </div>
      {mine ? (
        <UnstyledButton
          component="button"
          type="button"
          className={classes.toggle}
          aria-label={unit.name}
          aria-expanded={expanded}
          aria-controls={expanded ? detailsId : undefined}
          onClick={() => onToggle()}
        />
      ) : null}
      <div className={classes.hp}>
        {numbers ? (
          <HpBox
            viewer="player"
            hp={numbers.hp}
            maxHp={numbers.maxHp}
            tempHp={numbers.tempHp}
            mine={mine}
            data-tap={tapOf('hp')}
            onClick={mine ? () => onHp() : undefined}
          />
        ) : (
          <HpBox viewer="player" status={unit.healthStatus} />
        )}
      </div>
      {expanded ? (
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
              onClick={() => onConditions()}
            >
              <span className={classes.triggerLabel}>{t('conditions')}</span>
              {conditionsOpen ? (
                <IconChevronUp size={20} stroke={2} aria-hidden="true" />
              ) : (
                <IconChevronDown size={20} stroke={2} aria-hidden="true" />
              )}
            </UnstyledButton>
            <UnstyledButton
              component="button"
              type="button"
              className={classes.trigger}
              aria-haspopup="dialog"
              data-tap={tapOf('history')}
              onClick={() => onHistory()}
            >
              <span className={classes.triggerLabel}>{t('hpHistory')}</span>
              <IconChevronDown size={20} stroke={2} aria-hidden="true" />
            </UnstyledButton>
          </div>
          <NoteField value={note} onChange={onNoteChange} data-tap={tapOf('note')} />
          <CardActions open={moreOpen} onEdit={onEdit} onMore={onMore} />
        </div>
      ) : null}
    </div>
  );
}
