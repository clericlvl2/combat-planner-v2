import { IconDeviceMobile, IconUsers } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useMotion } from '../../provider.tsx';
import { LandingPhone } from './LandingPhone.tsx';
import classes from './LandingTable.module.css';
import {
  STAGE_PLAYER_DELAYS,
  STAGE_STILL_STEP,
  STAGE_TURN_MS,
  advanceStage,
  initialStage,
  stageAt,
} from './landingStage.ts';
import type { StageState } from './landingStage.ts';

export const LANDING_DESKTOP_MIN_WIDTH = 1180;

export interface LandingSize {
  width: number;
  height: number;
}

export interface LandingTableProps {
  size: LandingSize;
  scroller: HTMLElement | null;
}

type PhoneId = 'dm' | 'mika' | 'jonas';

interface PhonePlace {
  id: PhoneId;
  x: number;
  y: number;
  z: number;
  rotate: number;
  scale: number;
  scrollDepth: number;
  pointerDepth: number;
}

interface StageLayout {
  desktop: boolean;
  height: number | null;
  phones: readonly PhonePlace[];
  hostRing: number;
  playerRing: number;
}

function stageLayout({ width, height }: LandingSize): StageLayout {
  if (width >= LANDING_DESKTOP_MIN_WIDTH) {
    const fit = Math.min(1, (height - 130) / 780);
    const dm = 0.62 * fit;
    const player = 0.54 * fit;
    return {
      desktop: true,
      height: null,
      phones: [
        {
          id: 'dm',
          x: 0,
          y: 70,
          z: 30,
          rotate: -1,
          scale: dm,
          scrollDepth: -0.1,
          pointerDepth: 14,
        },
        {
          id: 'mika',
          x: -210,
          y: -60,
          z: 10,
          rotate: -6,
          scale: player,
          scrollDepth: -0.04,
          pointerDepth: -8,
        },
        {
          id: 'jonas',
          x: 215,
          y: -70,
          z: 10,
          rotate: 7,
          scale: player,
          scrollDepth: -0.05,
          pointerDepth: -10,
        },
      ],
      hostRing: Math.round(300 * fit),
      playerRing: Math.round(260 * fit),
    };
  }
  const fit = width / 384;
  const dm = 0.42 * fit;
  const player = 0.38 * fit;
  return {
    desktop: false,
    height: Math.round(460 * Math.max(0.8, fit)),
    phones: [
      { id: 'dm', x: 0, y: 44, z: 30, rotate: -1, scale: dm, scrollDepth: -0.1, pointerDepth: 12 },
      {
        id: 'mika',
        x: -112 * fit,
        y: -44,
        z: 10,
        rotate: -5,
        scale: player,
        scrollDepth: -0.04,
        pointerDepth: -8,
      },
      {
        id: 'jonas',
        x: 112 * fit,
        y: -50,
        z: 10,
        rotate: 6,
        scale: player,
        scrollDepth: -0.05,
        pointerDepth: -10,
      },
    ],
    hostRing: Math.round(300 * fit),
    playerRing: Math.round(260 * fit),
  };
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface StageStates {
  dm: StageState;
  mika: StageState;
  jonas: StageState;
  pulse: number;
}

const stillStates = (): StageStates => {
  const still = stageAt(STAGE_STILL_STEP);
  return { dm: still, mika: still, jonas: still, pulse: 0 };
};

const firstStates = (): StageStates => {
  const first = initialStage();
  return { dm: first, mika: first, jonas: first, pulse: 0 };
};

function usePlayingStage(still: boolean, scene: HTMLElement | null): StageStates {
  const [states, setStates] = useState<StageStates>(() => (still ? stillStates() : firstStates()));

  useEffect(() => {
    if (still || !scene) {
      setStates(stillStates());
      return;
    }
    let turn: ReturnType<typeof setTimeout> | undefined;
    const followers = new Set<ReturnType<typeof setTimeout>>();
    let dm = initialStage();
    let onScreen = false;
    setStates(firstStates());

    const follow = (id: 'mika' | 'jonas', next: StageState) => {
      const timer = setTimeout(() => {
        followers.delete(timer);
        setStates((current) => ({ ...current, [id]: next }));
      }, STAGE_PLAYER_DELAYS[id]);
      followers.add(timer);
    };

    const tick = () => {
      dm = advanceStage(dm);
      const next = dm;
      setStates((current) => ({ ...current, dm: next, pulse: current.pulse + 1 }));
      follow('mika', next);
      follow('jonas', next);
      schedule();
    };

    const schedule = () => {
      clearTimeout(turn);
      turn = setTimeout(tick, dm.step === 0 ? STAGE_TURN_MS * 1.6 : STAGE_TURN_MS);
    };

    const update = () => {
      if (onScreen && !document.hidden) schedule();
      else clearTimeout(turn);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) onScreen = entry.isIntersecting;
        update();
      },
      { threshold: 0.05 },
    );
    observer.observe(scene);
    document.addEventListener('visibilitychange', update);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      clearTimeout(turn);
      for (const timer of followers) clearTimeout(timer);
    };
  }, [still, scene]);

  return states;
}

function useTilt(
  still: boolean,
  desktop: boolean,
  scene: HTMLElement | null,
  scroller: HTMLElement | null,
) {
  useEffect(() => {
    if (still || !scene || !scroller) return;
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const paint = () => {
      frame = 0;
      scene.style.setProperty('--landing-sy', String(scroller.scrollTop));
      if (pointer) {
        const box = scroller.getBoundingClientRect();
        const x = (pointer.x - box.left) / box.width - 0.5;
        const y = (pointer.y - box.top) / box.height - 0.5;
        scene.style.setProperty('--landing-mx', x.toFixed(3));
        scene.style.setProperty('--landing-my', y.toFixed(3));
      }
    };

    const request = () => {
      if (frame === 0) frame = requestAnimationFrame(paint);
    };

    const onPointer = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      request();
    };

    scroller.addEventListener('scroll', request, { passive: true });
    if (desktop) scroller.addEventListener('pointermove', onPointer, { passive: true });
    request();

    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', request);
      scroller.removeEventListener('pointermove', onPointer);
      for (const name of ['--landing-sy', '--landing-mx', '--landing-my']) {
        scene.style.removeProperty(name);
      }
    };
  }, [still, desktop, scene, scroller]);
}

const playerDelays: Record<PhoneId, number> = {
  dm: 0,
  mika: STAGE_PLAYER_DELAYS.mika,
  jonas: STAGE_PLAYER_DELAYS.jonas,
};

const players: Record<Exclude<PhoneId, 'dm'>, { name: string; mine: string }> = {
  mika: { name: 'Mika', mine: 'vashti' },
  jonas: { name: 'Jonas', mine: 'aldric' },
};

export function LandingTable({ size, scroller }: LandingTableProps) {
  const { t } = useTranslation('Landing');
  const motion = useMotion();
  const [scene, setScene] = useState<HTMLDivElement | null>(null);
  const [reduced] = useState(prefersReducedMotion);
  const still = motion === 'off' || reduced;
  const layout = stageLayout(size);
  const states = usePlayingStage(still, scene);
  useTilt(still, layout.desktop, scene, scroller);

  const host = layout.phones[0];
  const pulse = states.pulse;

  return (
    <div
      ref={setScene}
      className={classes.scene}
      style={layout.height === null ? undefined : { height: layout.height }}
      aria-hidden="true"
      data-landing-stage=""
    >
      <div className={classes.plane}>
        {host && pulse > 0 ? (
          <>
            <span
              key={`ring-dm-${pulse}`}
              className={classes.ring}
              style={
                {
                  '--landing-x': `${host.x}px`,
                  '--landing-y': `${host.y}px`,
                  '--landing-d': `${layout.hostRing}px`,
                } as CSSProperties
              }
            />
            {layout.phones.slice(1).map((place) => {
              const dx = place.x - host.x;
              const dy = place.y - host.y;
              const delay = playerDelays[place.id];
              return (
                <span key={`${place.id}-${pulse}`}>
                  <span
                    className={classes.line}
                    style={
                      {
                        '--landing-x': `${host.x}px`,
                        '--landing-y': `${host.y}px`,
                        '--landing-a': `${((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(2)}deg`,
                        '--landing-t': `${delay}ms`,
                        width: Math.round(Math.hypot(dx, dy)),
                      } as CSSProperties
                    }
                  >
                    <i className={classes.dash} />
                  </span>
                  <span
                    className={classes.ring}
                    style={
                      {
                        '--landing-x': `${place.x}px`,
                        '--landing-y': `${place.y}px`,
                        '--landing-d': `${layout.playerRing}px`,
                        animationDelay: `${delay}ms`,
                      } as CSSProperties
                    }
                  />
                </span>
              );
            })}
          </>
        ) : null}
        {layout.phones.map((place) => {
          const player = place.id === 'dm' ? null : players[place.id];
          return (
            <div
              key={place.id}
              className={classes.phone}
              data-phone={place.id}
              style={
                {
                  '--landing-x': `${place.x}px`,
                  '--landing-y': `${place.y}px`,
                  '--landing-z': `${place.z}px`,
                  '--landing-r': `${place.rotate}deg`,
                  '--landing-k': place.scale.toFixed(3),
                  '--landing-ds': place.scrollDepth,
                  '--landing-dx': place.pointerDepth,
                } as CSSProperties
              }
            >
              <span className={classes.tag} data-player={player ? '' : undefined}>
                {player ? <IconUsers stroke={2} /> : <IconDeviceMobile stroke={2} />}
                {player ? `${t('player')} · ${player.name}` : t('dm')}
              </span>
              <LandingPhone
                state={states[place.id]}
                viewer={player ? 'player' : 'dm'}
                mine={player?.mine}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
