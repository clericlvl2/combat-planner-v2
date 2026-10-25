import type {
  Action,
  Condition,
  HpHistoryKind,
  PlayerCombat,
  PlayerUnit,
  UnitId,
} from '@combat-planner/domain';
import { IconHourglass, IconUserOff, IconUsers } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ulid } from 'ulid';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import type { DispatchResult } from '../../hooks/combat.ts';
import { useHpChanges } from '../../hooks/useHpChanges.ts';
import { useLocaleChoice } from '../../hooks/useLocaleChoice.ts';
import { EmptyState } from '../../molecules/EmptyState/EmptyState.tsx';
import { InitiativePopover } from '../../molecules/InitiativePopover/InitiativePopover.tsx';
import { ScrollList } from '../../molecules/ScrollList/ScrollList.tsx';
import { TurnBracket } from '../../molecules/TurnBracket/TurnBracket.tsx';
import { TurnStrip } from '../../molecules/TurnStrip/TurnStrip.tsx';
import { CombatHeader } from '../../organisms/CombatHeader/CombatHeader.tsx';
import { ConditionPicker } from '../../organisms/ConditionPicker/ConditionPicker.tsx';
import { DefenseSheet } from '../../organisms/DefenseSheet/DefenseSheet.tsx';
import { HpHistory } from '../../organisms/HpHistory/HpHistory.tsx';
import { Menu } from '../../organisms/Menu/Menu.tsx';
import { NumpadSheet } from '../../organisms/NumpadSheet/NumpadSheet.tsx';
import { PlayerRow } from '../../organisms/PlayerRow/PlayerRow.tsx';
import { UnitForm } from '../../organisms/UnitForm/UnitForm.tsx';
import type { UnitDraft } from '../../organisms/UnitForm/UnitForm.tsx';
import { useMotion } from '../../provider.tsx';
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

type Panel = 'initiative' | 'more' | 'conditions' | 'defenses' | 'history' | 'numpad' | 'edit';

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
  const hpChanges = useHpChanges(combat.units);
  const [toggling, setToggling] = useState(0);
  const [releasingId, setReleasingId] = useState<UnitId | null>(null);

  const motion = useMotion();
  const viewportRef = useRef<HTMLDivElement>(null);

  const setup = combat.status === 'setup';
  const own = (unit: PlayerUnit) => unit.role !== 'enemy' && unit.mine === true;
  const ownById = (unitId: UnitId | null) =>
    setup ? undefined : combat.units.find((unit) => unit.id === unitId && own(unit));
  const turnHero = ownById(combat.activeUnitId);
  const nextHero = turnHero ? undefined : ownById(combat.nextUnitId);
  const turnHeroId = turnHero?.id ?? null;

  const revealUnit = (unitId: UnitId) => {
    const row = viewportRef.current?.querySelector(`[data-unit-id="${unitId}"]`);
    row?.scrollIntoView({ block: 'center', behavior: motion === 'off' ? 'instant' : 'smooth' });
  };
  const revealRef = useRef(revealUnit);
  revealRef.current = revealUnit;

  useEffect(() => {
    if (turnHeroId !== null) revealRef.current(turnHeroId);
  }, [turnHeroId]);
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
    const sent = dispatch({ ...target(unit), type: hpActionTypes[kind], amount });
    if (kind === 'max') return sent;
    close();
    return undefined;
  };

  const changeConditions = (unit: PlayerUnit, next: Condition[]) => {
    const condition = toggledCondition(unit.conditions, next);
    if (!condition) return;
    setToggling((count) => count + 1);
    void dispatch({ ...target(unit), type: 'toggleCondition', condition }).finally(() =>
      setToggling((count) => count - 1),
    );
  };

  const saveEdit = (unit: PlayerUnit, draft: UnitDraft) => {
    send({ ...draft, ...target(unit), type: 'editUnit', role: 'hero' });
    close();
  };

  const selectMore = (unit: PlayerUnit, id: string) => {
    if (id !== RELEASE_CLAIM) return;
    close();
    setReleasingId(unit.id);
    void dispatch({ ...target(unit), type: 'releaseUnit' }).finally(() => {
      setReleasingId(null);
      setExpandedId(null);
    });
  };

  const numpadUnit = panelOf('numpad');
  const conditionsUnit = panelOf('conditions');
  const historyUnit = panelOf('history');
  const defensesUnit = panelOf('defenses');
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
      {turnHero ? (
        <TurnStrip kind="turn" onClick={() => revealUnit(turnHero.id)}>
          {t('yourTurn', { name: turnHero.name })}
        </TurnStrip>
      ) : nextHero ? (
        <TurnStrip kind="next" onClick={() => revealUnit(nextHero.id)}>
          {t('youAreNext')}
        </TurnStrip>
      ) : null}
      <ScrollList
        className={classes.list}
        contentClassName={classes.listContent}
        viewportRef={viewportRef}
      >
        <TurnBracket activeId={setup ? null : combat.activeUnitId} />
        {setup && combat.units.length > 0 ? (
          <div className={classes.waiting} role="status">
            <IconHourglass size={20} stroke={2} aria-hidden="true" />
            {t('waiting')}
          </div>
        ) : null}
        {combat.units.map((unit) => {
          const mine = own(unit);
          return (
            <div key={unit.id} className={classes.slot} data-unit-id={unit.id}>
              <PlayerRow
                className={classes.row}
                hpChange={hpChanges.get(unit.id)}
                unit={unit}
                mine={mine}
                expanded={mine && expandedId === unit.id}
                active={combat.activeUnitId === unit.id}
                setup={setup}
                conditionsOpen={isOpen('conditions', unit)}
                moreOpen={isOpen('more', unit)}
                busy={releasingId === unit.id}
                onToggle={() => {
                  if (expandedId === unit.id) close();
                  setExpandedId((current) => (current === unit.id ? null : unit.id));
                }}
                onInitiative={mine ? () => show('initiative', unit) : noop}
                onHp={mine ? () => show('numpad', unit) : noop}
                onConditions={() => show('conditions', unit)}
                onDefenses={mine ? () => show('defenses', unit) : undefined}
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
      </ScrollList>
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
          pending={toggling > 0}
        />
      ) : null}
      {defensesUnit ? (
        <DefenseSheet
          opened
          unitName={defensesUnit.name}
          base={{ ac: defensesUnit.ac ?? 0, pd: defensesUnit.pd ?? 0, md: defensesUnit.md ?? 0 }}
          mods={{
            ac: defensesUnit.acMod ?? 0,
            pd: defensesUnit.pdMod ?? 0,
            md: defensesUnit.mdMod ?? 0,
          }}
          onChange={(mods) => send({ ...target(defensesUnit), type: 'setDefenseMods', ...mods })}
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
