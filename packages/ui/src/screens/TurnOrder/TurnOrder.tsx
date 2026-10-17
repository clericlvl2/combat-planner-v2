import type {
  Action,
  Condition,
  HpHistoryKind,
  PlayerCombat,
  PlayerId,
  PlayerUnit,
  UnitId,
} from '@combat-planner/domain';
import { IconHourglass, IconUserOff, IconUsers } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ulid } from 'ulid';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import type { DispatchResult } from '../../hooks/combat.ts';
import { EmptyState } from '../../molecules/EmptyState/EmptyState.tsx';
import { InitiativePopover } from '../../molecules/InitiativePopover/InitiativePopover.tsx';
import { ConditionPicker } from '../../organisms/ConditionPicker/ConditionPicker.tsx';
import { HpHistory } from '../../organisms/HpHistory/HpHistory.tsx';
import { Menu } from '../../organisms/Menu/Menu.tsx';
import { NumpadSheet, useHpFlash } from '../../organisms/NumpadSheet/NumpadSheet.tsx';
import { PlayerHeader } from '../../organisms/PlayerHeader/PlayerHeader.tsx';
import { PlayerRow } from '../../organisms/PlayerRow/PlayerRow.tsx';
import { UnitForm } from '../../organisms/UnitForm/UnitForm.tsx';
import type { UnitDraft } from '../../organisms/UnitForm/UnitForm.tsx';
import { PlayerToast } from '../PlayerView/PlayerToast.tsx';
import classes from './TurnOrder.module.css';

export interface TurnOrderProps {
  combat: PlayerCombat;
  playerId: PlayerId;
  dispatch: (action: Action) => Promise<DispatchResult>;
  onHeroes: () => void;
  random?: () => number;
}

type Panel = 'initiative' | 'more' | 'conditions' | 'history' | 'numpad' | 'edit';

interface Open {
  panel: Panel;
  unitId: UnitId;
}

const RELEASE_CLAIM = 'releaseClaim';

const noop = () => {};

const toggledCondition = (
  before: readonly Condition[],
  after: readonly Condition[],
): Condition | undefined =>
  after.find((condition) => !before.includes(condition)) ??
  before.find((condition) => !after.includes(condition));

export function TurnOrder({ combat, playerId, dispatch, onHeroes, random }: TurnOrderProps) {
  const { t } = useTranslation('TurnOrder');
  const { t: tMenu } = useTranslation('Menu');
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<UnitId | null>(null);
  const [open, setOpen] = useState<Open | null>(null);
  const [flashId, setFlashId] = useState<UnitId | null>(null);
  const { flashing, flash } = useHpFlash();

  const setup = combat.status === 'setup';
  const own = (unit: PlayerUnit) => unit.role !== 'enemy' && unit.claimedBy === playerId;
  const openUnit = combat.units.find((unit) => unit.id === open?.unitId && own(unit));
  const panelOf = (panel: Panel): PlayerUnit | undefined =>
    open?.panel === panel ? openUnit : undefined;
  const isOpen = (panel: Panel, unit: PlayerUnit) =>
    open?.panel === panel && open.unitId === unit.id;
  const show = (panel: Panel, unit: PlayerUnit) => setOpen({ panel, unitId: unit.id });
  const close = () => setOpen(null);

  const send = (unit: PlayerUnit, body: Record<string, unknown> & { type: Action['type'] }) => {
    void dispatch({ ...body, id: ulid(), version: combat.version, unitId: unit.id } as Action);
  };

  const applyHp = (unit: PlayerUnit, kind: HpHistoryKind, amount: number) => {
    if (kind === 'max') return;
    const type = kind === 'damage' ? 'damage' : kind === 'heal' ? 'heal' : 'setTempHp';
    send(unit, { type, amount });
    close();
    setFlashId(unit.id);
    flash();
  };

  const changeConditions = (unit: PlayerUnit, next: Condition[]) => {
    const condition = toggledCondition(unit.conditions, next);
    if (condition) send(unit, { type: 'toggleCondition', condition });
  };

  const saveEdit = (unit: PlayerUnit, draft: UnitDraft) => {
    send(unit, { ...draft, type: 'editUnit', role: 'hero' });
    close();
  };

  const selectMore = (unit: PlayerUnit, id: string) => {
    if (id !== RELEASE_CLAIM) return;
    send(unit, { type: 'releaseUnit' });
    setExpandedId(null);
  };

  const numpadUnit = panelOf('numpad');
  const conditionsUnit = panelOf('conditions');
  const historyUnit = panelOf('history');
  const editUnit = panelOf('edit');

  return (
    <div className={classes.root}>
      <PlayerHeader
        title={combat.title}
        round={setup ? null : combat.round}
        escalation={combat.escalation as EscalationValue}
        menuOpened={menuOpen}
        onMenu={() => setMenuOpen((value) => !value)}
        onMenuClose={() => setMenuOpen(false)}
        onHeroes={() => {
          setMenuOpen(false);
          onHeroes();
        }}
      />
      <div className={classes.list}>
        {setup && combat.units.length > 0 ? (
          <div className={classes.waiting} role="status">
            <IconHourglass size={20} stroke={2} aria-hidden="true" />
            {t('waiting')}
          </div>
        ) : null}
        {combat.units.map((unit) => {
          const mine = own(unit);
          const claimer = unit.claimedBy ?? null;
          return (
            <div key={unit.id} className={classes.slot}>
              <PlayerRow
                className={classes.row}
                data-flash={(flashing && flashId === unit.id) || undefined}
                unit={unit}
                mine={mine}
                expanded={mine && expandedId === unit.id}
                claimedByName={claimer === null ? undefined : combat.players[claimer]}
                active={combat.activeUnitId === unit.id}
                setup={setup}
                conditionsOpen={isOpen('conditions', unit)}
                moreOpen={isOpen('more', unit)}
                onToggle={() => {
                  if (expandedId === unit.id) close();
                  setExpandedId((current) => (current === unit.id ? null : unit.id));
                }}
                onInitiative={mine ? () => show('initiative', unit) : noop}
                onHp={mine ? () => show('numpad', unit) : noop}
                onConditions={() => show('conditions', unit)}
                onHistory={() => show('history', unit)}
                onNoteChange={(note) => send(unit, { type: 'editNote', note })}
                onEdit={() => show('edit', unit)}
                onMore={() => (isOpen('more', unit) ? close() : show('more', unit))}
              />
              {mine ? (
                <InitiativePopover
                  className={classes.initiative}
                  open={isOpen('initiative', unit)}
                  value={unit.initiative}
                  bonus={0}
                  random={random}
                  onSet={(initiative) => send(unit, { type: 'setInitiative', initiative })}
                  onRoll={(_initiative, roll) => {
                    send(unit, { type: 'rollInitiative', roll });
                    close();
                  }}
                  onClose={close}
                />
              ) : null}
              {mine && expandedId === unit.id ? (
                <div className={classes.more}>
                  <Menu
                    opened={isOpen('more', unit)}
                    aria-label={tMenu('menuLabel')}
                    items={[{ id: RELEASE_CLAIM, icon: IconUserOff, label: tMenu('releaseClaim') }]}
                    onSelect={(id) => selectMore(unit, id)}
                    onClose={close}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
        {combat.units.length === 0 ? (
          <EmptyState icon={IconUsers} title={t('noUnitsTitle')} body={t('noUnitsBody')} />
        ) : null}
      </div>
      {numpadUnit ? (
        <NumpadSheet
          opened
          viewer="player"
          name={numpadUnit.name}
          role={numpadUnit.role}
          initiative={numpadUnit.initiative}
          hp={numpadUnit.hp ?? 0}
          maxHp={numpadUnit.maxHp ?? 1}
          tempHp={numpadUnit.tempHp ?? 0}
          history={(numpadUnit.hpHistory ?? []).toReversed()}
          onApply={(kind, amount) => applyHp(numpadUnit, kind, amount)}
          onClose={close}
        />
      ) : null}
      {conditionsUnit ? (
        <ConditionPicker
          opened
          unitName={conditionsUnit.name}
          value={conditionsUnit.conditions}
          onChange={(next) => changeConditions(conditionsUnit, next)}
          onClose={close}
        />
      ) : null}
      {historyUnit ? (
        <HpHistory
          variant="sheet"
          opened
          unitName={historyUnit.name}
          entries={(historyUnit.hpHistory ?? []).toReversed()}
          maxHp={historyUnit.maxHp ?? 1}
          onClose={close}
        />
      ) : null}
      {editUnit ? (
        <UnitForm
          opened
          mode="edit"
          lockRole
          value={{
            name: editUnit.name,
            role: 'hero',
            maxHp: editUnit.maxHp,
            tempHp: editUnit.tempHp,
            ac: editUnit.ac,
            pd: editUnit.pd,
            md: editUnit.md,
            note: editUnit.note,
          }}
          onSubmit={(draft) => saveEdit(editUnit, draft)}
          onCancel={close}
        />
      ) : null}
      <PlayerToast aboveBottomBar={false} />
    </div>
  );
}
