import { LIMITS } from '@combat-planner/domain';
import type { Action, PlayerCombat, PlayerUnit, UnitId } from '@combat-planner/domain';
import { IconLanguage, IconLock, IconLogin2, IconShield } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ulid } from 'ulid';
import { Button } from '../../atoms/Button/Button.tsx';
import { Checkbox } from '../../atoms/Checkbox/Checkbox.tsx';
import type { EscalationValue } from '../../atoms/EscalationDie/EscalationDie.tsx';
import { RoleBlock } from '../../atoms/RoleBlock/RoleBlock.tsx';
import { TextField } from '../../atoms/TextField/TextField.tsx';
import type { DispatchResult } from '../../hooks/combat.ts';
import { useLocaleChoice } from '../../hooks/useLocaleChoice.ts';
import { layout } from '../../layout.ts';
import { ScrollList } from '../../molecules/ScrollList/ScrollList.tsx';
import { BottomBar } from '../../organisms/BottomBar/BottomBar.tsx';
import { PlayerHeader } from '../../organisms/PlayerHeader/PlayerHeader.tsx';
import { PlayerToast, usePlayerToasts } from '../PlayerView/PlayerToast.tsx';
import { playerEvents } from '../PlayerView/playerEvents.ts';
import type { PlayerEvent } from '../PlayerView/playerEvents.ts';
import { localeNames } from '../Settings/localeNames.ts';
import { LanguageSheet } from '../shared/LanguageSheet.tsx';
import classes from './Heroes.module.css';

export interface HeroesProps {
  combat: PlayerCombat;
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

export function Heroes({ combat, dispatch, onDone }: HeroesProps) {
  const { t } = useTranslation('Heroes');
  const { t: tLanguage } = useTranslation('LanguageSheet');
  const { locale } = useLocaleChoice();
  const [languageOpen, setLanguageOpen] = useState(false);
  const languageName = localeNames[locale];
  const notify = usePlayerToasts();
  const storedName = combat.myName ?? undefined;
  const joined = storedName !== undefined;
  const [name, setName] = useState(storedName ?? '');
  const [nameTouched, setNameTouched] = useState(false);
  const [chosen, setChosen] = useState<ReadonlySet<UnitId>>(new Set());
  const previous = useRef(combat);
  const submitting = useRef(false);
  const [joining, setJoining] = useState(false);

  const heroes = combat.units.filter((unit) => unit.role === 'hero');
  const stateOf = (unit: PlayerUnit): HeroState => {
    if (unit.mine === true) return 'own';
    if ((unit.claimedByName ?? null) !== null) return 'taken';
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
    const taken = playerEvents(before, combat).filter(
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
  }, [combat, chosen, notify]);

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
        ? join(displayName, combat.version, [own.id])
        : Promise.resolve(true);
    submitting.current = true;
    setJoining(true);
    void work.then((done) => {
      submitting.current = false;
      setJoining(false);
      if (done) onDone();
    });
  };

  const subOf = (unit: PlayerUnit, state: HeroState): string => {
    if (state === 'own') return t('you');
    if (state === 'taken') return t('playing', { name: unit.claimedByName ?? '' });
    return t('free');
  };

  return (
    <div className={classes.root}>
      <PlayerHeader
        title={combat.title}
        round={combat.status === 'active' ? combat.round : null}
        escalation={combat.escalation as EscalationValue}
      />
      <ScrollList className={classes.body} contentClassName={classes.bodyContent}>
        <div className={classes.heading}>
          <h2 className={classes.title}>{t('title')}</h2>
          <Button
            className={classes.language}
            variant="ghost"
            size="S"
            icon={IconLanguage}
            aria-label={tLanguage('current', { name: languageName })}
            aria-haspopup="dialog"
            onClick={() => setLanguageOpen(true)}
          >
            {languageName}
          </Button>
        </div>
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
      </ScrollList>
      <div className={classes.footer}>
        <BottomBar
          label={joined ? t('done') : t('join')}
          icon={IconLogin2}
          disabled={!ready}
          loading={joining}
          hint={ready ? undefined : t('hint')}
          onClick={submit}
        />
        <div className={classes.toastAnchor} style={toastAnchor}>
          <PlayerToast aboveBottomBar={false} />
        </div>
      </div>
      <LanguageSheet opened={languageOpen} onClose={() => setLanguageOpen(false)} />
    </div>
  );
}
