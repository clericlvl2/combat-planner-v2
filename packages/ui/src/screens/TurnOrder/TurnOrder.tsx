import type {
  Action,
  Condition,
  HpHistoryKind,
  PlayerCombat,
  PlayerUnit,
  UnitId,
} from '@combat-planner/domain';
import { IconHourglass, IconUserOff, IconUsers } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ulid } from 'ulid';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import type { DispatchResult } from '../../hooks/combat.ts';
import { useLocaleChoice } from '../../hooks/useLocaleChoice.ts';
import { EmptyState } from '../../molecules/EmptyState/EmptyState.tsx';
import { InitiativePopover } from '../../molecules/InitiativePopover/InitiativePopover.tsx';
import { CombatHeader } from '../../organisms/CombatHeader/CombatHeader.tsx';
import { ConditionPicker } from '../../organisms/ConditionPicker/ConditionPicker.tsx';
import { HpHistory } from '../../organisms/HpHistory/HpHistory.tsx';
import { Menu } from '../../organisms/Menu/Menu.tsx';
import { NumpadSheet, useHpFlash } from '../../organisms/NumpadSheet/NumpadSheet.tsx';
import { PlayerRow } from '../../organisms/PlayerRow/PlayerRow.tsx';
import { UnitForm } from '../../organisms/UnitForm/UnitForm.tsx';
import type { UnitDraft } from '../../organisms/UnitForm/UnitForm.tsx';
import { PlayerToast } from '../PlayerView/PlayerToast.tsx';
import { localeNames } from '../Settings/localeNames.ts';
import { LanguageSheet } from '../shared/LanguageSheet.tsx';
import classes from './TurnOrder.module.css';

export interface TurnOrderProps {
  combat: PlayerCombat;
  dispatch: (action: Action) => Promise<DispatchResult>;
  onHeroes: () => void;
  onLeave?: () => void;
  random?: () => number;
}

type Panel = 'initiative' | 'more' | 'conditions' | 'history' | 'numpad' | 'edit';

interface Open {
  panel: Panel;
  unitId: UnitId;
}

const RELEASE_CLAIM = 'releaseClaim';

const hpActionTypes = {
  damage: 'damage',
  heal: 'heal',
  temp: 'setTempHp',
  max: 'setMaxHp',
} as const satisfies Record<HpHistoryKind, Action['type']>;

const noop = () => {};

const toggledCondition = (
  before: readonly Condition[],
  after: readonly Condition[],
): Condition | undefined =>
  after.find((condition) => !before.includes(condition)) ??
  before.find((condition) => !after.includes(condition));

export function TurnOrder({ combat, dispatch, onHeroes, onLeave, random }: TurnOrderProps) {
  const { t } = useTranslation('TurnOrder');
  const { t: tMenu } = useTranslation('Menu');
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const { locale } = useLocaleChoice();
  const [expandedId, setExpandedId] = useState<UnitId | null>(null);
  const [open, setOpen] = useState<Open | null>(null);
  const [flashId, setFlashId] = useState<UnitId | null>(null);
  const { flashing, flash } = useHpFlash();

  const setup = combat.status === 'setup';
  const own = (unit: PlayerUnit) => unit.role !== 'enemy' && unit.mine === true;
  const openUnit = combat.units.find((unit) => unit.id === open?.unitId && own(unit));
  const panelOf = (panel: Panel): PlayerUnit | undefined =>
    open?.panel === panel ? openUnit : undefined;
  const isOpen = (panel: Panel, unit: PlayerUnit) =>
    open?.panel === panel && open.unitId === unit.id;
  const show = (panel: Panel, unit: PlayerUnit) => setOpen({ panel, unitId: unit.id });
  const close = () => setOpen(null);

  const target = (unit: PlayerUnit) => ({
    id: ulid(),
    version: combat.version,
    unitId: unit.id,
  });

  const send = (action: Action) => {
    void dispatch(action);
  };

  const applyHp = (unit: PlayerUnit, kind: HpHistoryKind, amount: number) => {
    close();
    void dispatch({ ...target(unit), type: hpActionTypes[kind], amount }).then((result) => {
      if (!result.applied) return;
      setFlashId(unit.id);
      flash();
    });
  };

  const changeConditions = (unit: PlayerUnit, next: Condition[]) => {
    const condition = toggledCondition(unit.conditions, next);
    if (condition) send({ ...target(unit), type: 'toggleCondition', condition });
  };

  const saveEdit = (unit: PlayerUnit, draft: UnitDraft) => {
    send({ ...draft, ...target(unit), type: 'editUnit', role: 'hero' });
    close();
  };

  const selectMore = (unit: PlayerUnit, id: string) => {
    if (id !== RELEASE_CLAIM) return;
    send({ ...target(unit), type: 'releaseUnit' });
    setExpandedId(null);
  };

  const numpadUnit = panelOf('numpad');
  const conditionsUnit = panelOf('conditions');
  const historyUnit = panelOf('history');
  const editUnit = panelOf('edit');

  return (
    <div className={classes.root}>
      <CombatHeader
        viewer="player"
        title={combat.title}
        round={setup ? null : combat.round}
        escalation={combat.escalation as EscalationValue}
        open={menuOpen ? 'menu' : null}
        onMenu={() => setMenuOpen((value) => !value)}
        onClose={() => setMenuOpen(false)}
        onHeroes={() => {
          setMenuOpen(false);
          onHeroes();
        }}
        languageName={localeNames[locale]}
        onLanguage={() => {
          setMenuOpen(false);
          setLanguageOpen(true);
        }}
        onLeave={() => {
          setMenuOpen(false);
          onLeave?.();
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
          return (
            <div key={unit.id} className={classes.slot}>
              <PlayerRow
                className={classes.row}
                flash={flashing && flashId === unit.id}
                unit={unit}
                mine={mine}
                expanded={mine && expandedId === unit.id}
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
                onNoteChange={(note) => send({ ...target(unit), type: 'editNote', note })}
                onEdit={() => show('edit', unit)}
                onMore={() => (isOpen('more', unit) ? close() : show('more', unit))}
              />
              {mine ? (
                <InitiativePopover
                  className={classes.initiative}
                  open={isOpen('initiative', unit)}
                  value={unit.initiative}
                  bonus={unit.initiativeBonus ?? 0}
                  random={random}
                  onSet={(initiative) =>
                    send({ ...target(unit), type: 'setInitiative', initiative })
                  }
                  onRoll={(_initiative, roll) => {
                    send({ ...target(unit), type: 'rollInitiative', roll });
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
      <LanguageSheet opened={languageOpen} onClose={() => setLanguageOpen(false)} />
      <PlayerToast aboveBottomBar={false} />
    </div>
  );
}
