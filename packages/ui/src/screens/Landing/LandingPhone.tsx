import { healthStatus } from '@combat-planner/domain';
import type { HealthStatus } from '@combat-planner/domain';
import { IconChevronLeft, IconDots, IconNote } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import classes from './LandingPhone.module.css';
import { STAGE_COMBAT_TITLE, nextUnitName } from './landingStage.ts';
import type { StageDelta, StageDeltaKind, StageState, StageUnit } from './landingStage.ts';

export type LandingViewer = 'dm' | 'player';

export interface LandingPhoneProps {
  state: StageState;
  viewer: LandingViewer;
  mine?: string;
}

const pipsOf: Record<HealthStatus, number> = {
  full: 2,
  wounded: 1,
  staggered: 1,
  unconscious: 0,
  dead: 0,
};

const dieFaces: Record<number, readonly number[]> = {
  0: [],
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const dieSlots = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

const defenses = ['ac', 'pd', 'md'] as const;

function formatHp(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : String(value);
}

interface SwapProps {
  text: string;
  className?: string;
  ellipsis?: boolean;
}

function Swap({ text, className, ellipsis = false }: SwapProps) {
  return (
    <span
      className={className ? `${classes.swap} ${className}` : classes.swap}
      data-ellipsis={ellipsis || undefined}
    >
      <span key={text} className={classes.swapIn}>
        {text}
      </span>
    </span>
  );
}

interface DieProps {
  value: number;
  ticket?: boolean;
}

function Die({ value, ticket = false }: DieProps) {
  const { t } = useTranslation('EscalationDie');
  const face = dieFaces[value] ?? [];
  return (
    <span
      className={classes.die}
      data-empty={value === 0 || undefined}
      data-ticket={ticket || undefined}
    >
      <span className={classes.dieTile}>
        {dieSlots.map((slot) => (
          <span key={slot} className={classes.dieSlot}>
            <span className={classes.diePip} data-on={face.includes(slot) || undefined} />
          </span>
        ))}
      </span>
      {ticket ? null : (
        <Swap
          className={classes.dieCaption}
          text={value === 0 ? t('none') : t('value', { value })}
        />
      )}
    </span>
  );
}

interface HpProps {
  unit: StageUnit;
  viewer: LandingViewer;
  mine: boolean;
  bump?: StageDeltaKind;
}

function Hp({ unit, viewer, mine, bump }: HpProps) {
  const status = healthStatus(unit.hp, unit.maxHp, unit.role);
  const pips = pipsOf[status];
  const off = status === 'dead';
  const numbers = viewer === 'dm' || unit.role !== 'enemy';
  return (
    <span
      className={classes.hp}
      data-viewer={viewer}
      data-status={status}
      data-off={off || undefined}
    >
      {numbers ? (
        <span
          className={classes.hpNumbers}
          data-editable={((viewer === 'dm' || mine) && !off) || undefined}
        >
          <span key={unit.hp} className={classes.hpCurrent} data-bump={bump}>
            {formatHp(unit.hp)}
          </span>
          <span className={classes.hpMax}>/{unit.maxHp}</span>
        </span>
      ) : null}
      <span className={classes.hpPips}>
        <span className={classes.hpPip} data-filled={pips > 0 || undefined} />
        <span className={classes.hpPip} data-filled={pips > 1 || undefined} />
      </span>
      {numbers && unit.tempHp > 0 ? <span className={classes.hpBadge}>+{unit.tempHp}</span> : null}
    </span>
  );
}

interface RowProps {
  unit: StageUnit;
  viewer: LandingViewer;
  mine: boolean;
  active: boolean;
  deltas: readonly StageDelta[];
}

function Row({ unit, viewer, mine, active, deltas }: RowProps) {
  const { t } = useTranslation(['RoleBlock', 'DefenseLine', 'Chip']);
  const dead = unit.hp <= 0;
  const showDefenses = viewer === 'dm' || unit.role !== 'enemy';
  return (
    <div
      className={classes.row}
      data-role={unit.role}
      data-active={active || undefined}
      data-dead={dead || undefined}
    >
      <span className={classes.role} data-role={unit.role}>
        <span className={classes.roleValue} data-editable={viewer === 'dm' || mine || undefined}>
          {unit.initiative}
        </span>
        <span className={classes.roleLabel}>{t(`RoleBlock:${unit.role}`)}</span>
        {mine ? <span className={classes.you}>{t('RoleBlock:you')}</span> : null}
      </span>
      <div className={classes.main}>
        <span className={classes.name}>{unit.name}</span>
        {showDefenses ? (
          <span className={classes.defenses}>
            {defenses.map((defense) => (
              <span key={defense} className={classes.defense}>
                <span className={classes.defenseLabel}>{t(`DefenseLine:${defense}`)}</span>
                <span className={classes.defenseValue}>{unit[defense]}</span>
              </span>
            ))}
          </span>
        ) : null}
        {unit.conditions.length > 0 ? (
          <span className={classes.conditions}>
            {unit.conditions.map((condition) => (
              <span
                key={condition}
                className={classes.chip}
                style={{
                  background: `var(--cp-condition-${condition}-fill)`,
                  color: `var(--cp-condition-${condition}-text)`,
                }}
              >
                {t(`Chip:${condition}`)}
              </span>
            ))}
          </span>
        ) : null}
        {mine && unit.note ? (
          <span className={classes.note}>
            <IconNote size={16} stroke={2} />
            {unit.note}
          </span>
        ) : null}
      </div>
      <div className={classes.hpCell}>
        <Hp unit={unit} viewer={viewer} mine={mine} bump={deltas[0]?.kind} />
      </div>
      {deltas.map((delta) => (
        <span key={delta.id} className={classes.delta} data-kind={delta.kind}>
          {delta.kind === 'damage' ? '−' : '+'}
          {delta.amount}
        </span>
      ))}
    </div>
  );
}

function DmHeader({ state }: { state: StageState }) {
  const { t } = useTranslation('CombatHeader');
  return (
    <div className={classes.header}>
      <span className={classes.headerStatus} />
      <span className={classes.bar}>
        <span className={classes.back}>
          <IconChevronLeft size={24} stroke={2} />
        </span>
        <span className={classes.title} data-ellipsis="">
          {STAGE_COMBAT_TITLE}
        </span>
        <span className={classes.menu}>
          <IconDots size={24} stroke={2} />
        </span>
      </span>
      <span className={classes.ticket}>
        <span className={classes.cell} data-part="round">
          <span className={classes.caption}>{t('round')}</span>
          <Swap className={classes.number} text={String(state.round)} />
        </span>
        <span className={classes.divider} />
        <span className={classes.cell} data-part="escalation">
          <Die value={state.escalation} ticket />
          <span className={classes.stack}>
            <span className={classes.caption}>{t('escalationCaption')}</span>
            <Swap className={classes.number} text={`+${state.escalation}`} />
          </span>
        </span>
      </span>
    </div>
  );
}

function PlayerHeader({ state }: { state: StageState }) {
  const { t } = useTranslation('PlayerHeader');
  return (
    <div className={classes.header}>
      <span className={classes.headerStatus} />
      <span className={classes.playerBody}>
        <span className={classes.playerText}>
          <span className={classes.playerTitle} data-ellipsis="">
            {STAGE_COMBAT_TITLE}
          </span>
          <Swap className={classes.playerRound} text={t('round', { round: state.round })} />
        </span>
        <Die value={state.escalation} />
      </span>
    </div>
  );
}

function TurnBar({ state }: { state: StageState }) {
  const { t } = useTranslation('TurnBar');
  return (
    <div className={classes.turnBar}>
      <span key={`${state.loop}-${state.step}`} className={classes.turnButton}>
        <span className={classes.turnTitle}>{t('nextTurn')}</span>
        <Swap className={classes.turnNext} text={nextUnitName(state)} ellipsis />
      </span>
    </div>
  );
}

export function LandingPhone({ state, viewer, mine }: LandingPhoneProps) {
  return (
    <div className={classes.phone}>
      <span className={classes.statusBar}>9:41</span>
      <div className={classes.screen}>
        {viewer === 'dm' ? <DmHeader state={state} /> : <PlayerHeader state={state} />}
        <div className={classes.list}>
          {state.units.map((unit, index) => (
            <Row
              key={unit.id}
              unit={unit}
              viewer={viewer}
              mine={unit.id === mine}
              active={index === state.active}
              deltas={state.deltas.filter((delta) => delta.unit === unit.id)}
            />
          ))}
        </div>
        {viewer === 'dm' ? <TurnBar state={state} /> : null}
      </div>
    </div>
  );
}
