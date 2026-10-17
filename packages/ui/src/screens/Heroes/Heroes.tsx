import { LIMITS } from '@combat-planner/domain';
import type { Action, PlayerCombat, PlayerId, PlayerUnit, UnitId } from '@combat-planner/domain';
import { IconLock, IconLogin2, IconShield } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ulid } from 'ulid';
import { Checkbox } from '../../atoms/Checkbox/Checkbox.tsx';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import { RoleBlock } from '../../atoms/RoleBlock/RoleBlock.tsx';
import { TextField } from '../../atoms/TextField/TextField.tsx';
import type { DispatchResult } from '../../hooks/combat.ts';
import { layout } from '../../layout.ts';
import { BottomBar } from '../../organisms/BottomBar/BottomBar.tsx';
import { PlayerHeader } from '../../organisms/PlayerHeader/PlayerHeader.tsx';
import { PlayerToast, usePlayerToasts } from '../PlayerView/PlayerToast.tsx';
import { playerEvents } from '../PlayerView/playerEvents.ts';
import type { PlayerEvent } from '../PlayerView/playerEvents.ts';
import classes from './Heroes.module.css';

export interface HeroesProps {
  combat: PlayerCombat;
  playerId: PlayerId;
  dispatch: (action: Action) => Promise<DispatchResult>;
  onDone: () => void;
}

const toastAnchor: CSSProperties = {
  bottom: `calc(100% + ${layout.toast.aboveBar - layout.toast.withoutBar}px)`,
};

type HeroState = 'own' | 'chosen' | 'taken' | 'free';

const validName = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= LIMITS.displayName ? trimmed : null;
};

export function Heroes({ combat, playerId, dispatch, onDone }: HeroesProps) {
  const { t } = useTranslation('Heroes');
  const notify = usePlayerToasts();
  const storedName = combat.players[playerId];
  const joined = storedName !== undefined;
  const [name, setName] = useState(storedName ?? '');
  const [nameTouched, setNameTouched] = useState(false);
  const [chosen, setChosen] = useState<ReadonlySet<UnitId>>(new Set());
  const previous = useRef(combat);
  const submitting = useRef(false);

  const heroes = combat.units.filter((unit) => unit.role === 'hero');
  const claimerOf = (unit: PlayerUnit) => unit.claimedBy ?? null;
  const stateOf = (unit: PlayerUnit): HeroState => {
    const claimer = claimerOf(unit);
    if (claimer === playerId) return 'own';
    if (claimer !== null) return 'taken';
    return chosen.has(unit.id) ? 'chosen' : 'free';
  };
  const picked = heroes.filter((unit) => {
    const state = stateOf(unit);
    return state === 'own' || state === 'chosen';
  });
  const displayName = validName(name);
  const ready = displayName !== null && picked.length > 0;

  useEffect(() => {
    const before = previous.current;
    previous.current = combat;
    if (before === combat) return;
    const taken = playerEvents(before, combat, playerId).filter(
      (event): event is Extract<PlayerEvent, { kind: 'taken' }> =>
        event.kind === 'taken' && chosen.has(event.unitId),
    );
    if (taken.length === 0) return;
    for (const event of taken) notify('taken', event.name);
    setChosen((current) => {
      const next = new Set(current);
      for (const event of taken) next.delete(event.unitId);
      return next;
    });
  }, [combat, playerId, chosen, notify]);

  const toggle = (unit: PlayerUnit, checked: boolean) => {
    const state = stateOf(unit);
    if (state === 'taken') return;
    if (!joined) {
      setChosen((current) => {
        const next = new Set(current);
        if (checked) next.add(unit.id);
        else next.delete(unit.id);
        return next;
      });
      return;
    }
    if (checked && state === 'free') {
      void dispatch({
        id: ulid(),
        version: combat.version,
        type: 'claimUnit',
        unitId: unit.id,
        displayName: displayName ?? storedName,
      });
    } else if (!checked && state === 'own') {
      void dispatch({ id: ulid(), version: combat.version, type: 'releaseUnit', unitId: unit.id });
    }
  };

  const join = async (
    claimName: string,
    from: number,
    unitIds: readonly UnitId[],
  ): Promise<boolean> => {
    let version = from;
    for (const unitId of unitIds) {
      const result = await dispatch({
        id: ulid(),
        version,
        type: 'claimUnit',
        unitId,
        displayName: claimName,
      });
      if (!result.applied) return false;
      version = result.version;
    }
    return true;
  };

  const rename = async (claimName: string, unit: PlayerUnit): Promise<boolean> => {
    const released = await dispatch({
      id: ulid(),
      version: combat.version,
      type: 'releaseUnit',
      unitId: unit.id,
    });
    if (!released.applied) return false;
    return join(claimName, released.version, [unit.id]);
  };

  const submit = () => {
    if (!ready || displayName === null || submitting.current) return;
    const own = picked.find((unit) => stateOf(unit) === 'own');
    const work = !joined
      ? join(
          displayName,
          combat.version,
          picked.filter((unit) => stateOf(unit) === 'chosen').map((unit) => unit.id),
        )
      : own && displayName !== storedName
        ? rename(displayName, own)
        : Promise.resolve(true);
    submitting.current = true;
    void work.then((done) => {
      submitting.current = false;
      if (done) onDone();
    });
  };

  const subOf = (unit: PlayerUnit, state: HeroState): string => {
    if (state === 'own') return t('you');
    if (state === 'taken') {
      const claimer = claimerOf(unit);
      return t('playing', { name: claimer === null ? '' : (combat.players[claimer] ?? '') });
    }
    return t('free');
  };

  return (
    <div className={classes.root}>
      <PlayerHeader
        title={combat.title}
        round={combat.status === 'active' ? combat.round : null}
        escalation={combat.escalation as EscalationValue}
      />
      <div className={classes.body}>
        <h2 className={classes.title}>{t('title')}</h2>
        <TextField
          label={t('nameLabel')}
          placeholder={t('namePlaceholder')}
          value={name}
          maxLength={LIMITS.displayName}
          error={nameTouched && displayName === null ? t('nameError') : undefined}
          autoComplete="nickname"
          onChange={setName}
          onBlur={() => setNameTouched(true)}
        />
        <div className={classes.section}>
          <span className={classes.sectionLabel} id="heroes-label">
            {t('heroesLabel')}
          </span>
          <div className={classes.list} role="group" aria-labelledby="heroes-label">
            {heroes.map((unit) => {
              const state = stateOf(unit);
              return (
                <Checkbox
                  key={unit.id}
                  className={classes.hero}
                  data-state={state}
                  checked={state === 'own' || state === 'chosen'}
                  disabled={state === 'taken'}
                  aria-label={unit.name}
                  onChange={(checked) => toggle(unit, checked)}
                  label={
                    <>
                      {state === 'own' ? (
                        <RoleBlock
                          className={classes.role}
                          unitRole="hero"
                          top={
                            unit.initiative === null
                              ? null
                              : { kind: 'initiative', value: unit.initiative }
                          }
                          mine
                        />
                      ) : (
                        <span className={classes.tile} aria-hidden="true">
                          {state === 'taken' ? (
                            <IconLock size={20} stroke={2} />
                          ) : (
                            <IconShield size={20} stroke={2} />
                          )}
                        </span>
                      )}
                      <span className={classes.text}>
                        <span className={classes.name}>{unit.name}</span>
                        <span className={classes.sub}>{subOf(unit, state)}</span>
                      </span>
                    </>
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className={classes.footer}>
        <BottomBar
          label={joined ? t('done') : t('join')}
          icon={IconLogin2}
          disabled={!ready}
          hint={ready ? undefined : t('hint')}
          onClick={submit}
        />
        <div className={classes.toastAnchor} style={toastAnchor}>
          <PlayerToast aboveBottomBar={false} />
        </div>
      </div>
    </div>
  );
}
